import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useCategories } from './useCategories';
import { useSuppliers } from './useSuppliers';
import type { Product, ProductColor } from '../../types/database.types';
import type { ProductFormValues } from './useProductMutations';
import { ModalShell, Spinner } from '../../components/common/ui';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { countRichTextWords, normalizeRichTextForEditor, sanitizeRichText } from '../../lib/richText';
import {
  compressProductImage,
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_IMAGES_TOTAL_BYTES,
  PRODUCT_IMAGE_BUCKET,
  productImagePathFromUrl,
  uploadProductImage,
} from '../../lib/productImage';

function createSchema(tr: (english: string, bangla: string) => string) {
  return z.object({
    name: z.string().min(2, tr('Name must be at least 2 characters', 'নাম কমপক্ষে ২ অক্ষর হতে হবে')),
    slug: z.string().min(2, tr('Slug is required', 'Slug আবশ্যক')).regex(/^[a-z0-9-]+$/, tr('Use lowercase letters, numbers and hyphens only', 'শুধু lowercase, সংখ্যা ও hyphen')),
    description: z.string().optional().refine((value) => countRichTextWords(value ?? '') <= 600, tr('Description can be at most 600 words', 'বিবরণ সর্বোচ্চ ৬০০ শব্দ হতে পারবে')),
    price: z.coerce.number().positive(tr('Price must be greater than 0', 'দাম ০-এর বেশি হতে হবে')),
    discount_price: z.preprocess((v) => v === '' ? undefined : v, z.coerce.number().min(0).optional()),
    category_id: z.string().min(1, tr('Category is required', 'ক্যাটাগরি আবশ্যক')),
    subcategory_id: z.string().min(1, tr('Sub-category is required', 'সাব-ক্যাটাগরি আবশ্যক')),
    supplier_id: z.string().min(1, tr('Supplier is required', 'সাপ্লায়ার আবশ্যক')),
    sku: z.string().optional(),
    stock_quantity: z.coerce.number().int().min(0, tr('Stock must be 0 or more', 'স্টক ০ বা তার বেশি হতে হবে')),
  }).superRefine((value, ctx) => {
    if (value.discount_price != null && value.discount_price > 0 && value.discount_price >= value.price) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discount_price'], message: tr('Discount price must be lower than actual price', 'ডিসকাউন্ট দাম আসল দামের কম হতে হবে') });
    }
  });
}

type FormShape = z.infer<ReturnType<typeof createSchema>>;
type ImageJobStatus = 'queued' | 'compressing' | 'uploading' | 'done' | 'error';
type ImageUploadJob = { id: string; name: string; previewUrl: string; originalBytes: number; compressedBytes?: number; progress: number; status: ImageJobStatus; url?: string; path?: string; error?: string };

interface ProductFormModalProps {
  product?: Product | null;
  prefill?: { name?: string; description?: string };
  onClose: () => void;
  onSubmit: (values: ProductFormValues) => Promise<void> | void;
  isSubmitting: boolean;
}

function slugify(text: string) { return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function formatKb(bytes: number) { return bytes <= 0 ? '0KB' : `${Math.max(1, Math.ceil(bytes / 1024))}KB`; }
function statusLabel(status: ImageJobStatus, tr: (a: string, b: string) => string) {
  if (status === 'queued') return tr('Queued', 'অপেক্ষমাণ');
  if (status === 'compressing') return tr('Compressing to 40KB', '40KB-তে কমপ্রেস হচ্ছে');
  if (status === 'uploading') return tr('Uploading', 'আপলোড হচ্ছে');
  if (status === 'done') return tr('Upload complete', 'আপলোড সম্পন্ন');
  return tr('Upload failed', 'আপলোড ব্যর্থ');
}

export function ProductFormModal({ product, prefill, onClose, onSubmit, isSubmitting }: ProductFormModalProps) {
  const { tr } = useLanguage();
  const schema = useMemo(() => createSchema(tr), [tr]);
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers(false);
  const { session } = useAuth();
  const isEdit = Boolean(product);

  const currentSubcategory = categories.find((category) => category.id === product?.category_id);
  const initialCategoryId = currentSubcategory?.parent_id ?? '';
  const [colors, setColors] = useState<ProductColor[]>((product?.colors ?? []).slice(0, 8));
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#000000');
  const [existingImages, setExistingImages] = useState<string[]>((product?.images ?? []).slice(0, MAX_PRODUCT_IMAGES));
  const [imageJobs, setImageJobs] = useState<ImageUploadJob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const uploadedPathsRef = useRef(new Set<string>());
  const persistUploadedImagesRef = useRef(false);

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormShape>({
    resolver: zodResolver(schema),
    defaultValues: product ? {
      name: product.name,
      slug: product.slug,
      description: normalizeRichTextForEditor(product.description),
      price: product.price,
      discount_price: product.discount_price ?? undefined,
      category_id: initialCategoryId,
      subcategory_id: product.category_id ?? '',
      supplier_id: product.supplier_id ?? '',
      sku: product.sku ?? '',
      stock_quantity: product.stock_quantity,
    } : {
      name: prefill?.name ?? '', slug: slugify(prefill?.name ?? ''), description: normalizeRichTextForEditor(prefill?.description ?? ''),
      price: 1, stock_quantity: 0, category_id: '', subcategory_id: '', supplier_id: '', sku: '',
    },
  });

  const nameValue = watch('name');
  const selectedCategoryId = watch('category_id');
  const selectedSubcategoryId = watch('subcategory_id');
  const selectedSupplierId = watch('supplier_id');
  const subcategories = categories.filter((c) => c.parent_id === selectedCategoryId && c.is_active);
  const rootCategories = categories.filter((c) => !c.parent_id && c.is_active);
  const matchingSuppliers = suppliers.filter((supplier) =>
    supplier.category_id === selectedCategoryId && supplier.subcategory_id === selectedSubcategoryId,
  );
  const activeStatuses: ImageJobStatus[] = ['queued', 'compressing', 'uploading'];
  const hasActiveImageJobs = imageJobs.some((job) => activeStatuses.includes(job.status));
  const hasFailedImageJobs = imageJobs.some((job) => job.status === 'error');
  const completedImageJobs = imageJobs.filter((job) => job.status === 'done' && job.url);
  const totalImageCount = existingImages.length + imageJobs.length;
  const remainingImageSlots = Math.max(0, MAX_PRODUCT_IMAGES - totalImageCount);
  const totalNewImageBytes = completedImageJobs.reduce((sum, image) => sum + (image.compressedBytes ?? 0), 0);
  const overallImageProgress = imageJobs.length ? Math.round(imageJobs.reduce((sum, image) => sum + image.progress, 0) / imageJobs.length) : 0;
  const isBusy = isSubmitting || hasActiveImageJobs;
  const canSubmit = !isBusy && !hasFailedImageJobs;

  useEffect(() => { if (!isEdit && nameValue) setValue('slug', slugify(nameValue)); }, [nameValue, isEdit, setValue]);
  useEffect(() => {
    if (!product || categories.length === 0) return;
    const subcategory = categories.find((category) => category.id === product.category_id);
    if (subcategory?.parent_id) {
      setValue('category_id', subcategory.parent_id);
      setValue('subcategory_id', product.category_id ?? '');
    }
  }, [product, categories, setValue]);
  useEffect(() => {
    const selectedSub = categories.find((c) => c.id === selectedSubcategoryId);
    if (selectedSub && selectedSub.parent_id !== selectedCategoryId) setValue('subcategory_id', '');
  }, [selectedCategoryId, selectedSubcategoryId, categories, setValue]);
  useEffect(() => {
    if (!selectedSupplierId || !selectedCategoryId || !selectedSubcategoryId || suppliers.length === 0) return;
    const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId);
    if (selectedSupplier && (selectedSupplier.category_id !== selectedCategoryId || selectedSupplier.subcategory_id !== selectedSubcategoryId)) {
      setValue('supplier_id', '');
    }
  }, [selectedCategoryId, selectedSubcategoryId, selectedSupplierId, suppliers, setValue]);
  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    if (!persistUploadedImagesRef.current && uploadedPathsRef.current.size) void supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(Array.from(uploadedPathsRef.current));
  }, []);

  const updateImageJob = (id: string, patch: Partial<ImageUploadJob>) => setImageJobs((current) => current.map((job) => job.id === id ? { ...job, ...patch } : job));
  const processAndUploadFile = async (id: string, file: File) => {
    try {
      updateImageJob(id, { status: 'compressing', progress: 3 });
      const compressed = await compressProductImage(file, (p) => updateImageJob(id, { status: 'compressing', progress: Math.max(3, Math.min(72, Math.round(p * 0.72))) }));
      const preview = URL.createObjectURL(compressed); previewUrlsRef.current.add(preview);
      setImageJobs((current) => current.map((job) => {
        if (job.id !== id) return job;
        URL.revokeObjectURL(job.previewUrl); previewUrlsRef.current.delete(job.previewUrl);
        return { ...job, previewUrl: preview, compressedBytes: compressed.size, status: 'uploading', progress: 76 };
      }));
      if (!session?.user) throw new Error(tr('Please log in again to upload images', 'ছবি আপলোড করতে আবার লগইন করুন'));
      const uploaded = await uploadProductImage(compressed, session.user.id); uploadedPathsRef.current.add(uploaded.path);
      updateImageJob(id, { status: 'done', progress: 100, url: uploaded.url, path: uploaded.path, compressedBytes: compressed.size, error: undefined });
    } catch (error) {
      const message = error instanceof Error ? error.message : tr('Image processing/upload failed', 'ছবি প্রসেস/আপলোড করা যায়নি');
      updateImageJob(id, { status: 'error', error: message }); toast.error(message);
    }
  };

  const handleImageSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []); event.target.value = '';
    if (!selectedFiles.length) return;
    const available = Math.max(0, MAX_PRODUCT_IMAGES - existingImages.length - imageJobs.length);
    if (!available) return toast.error(tr('Maximum 8 product images are allowed', 'সর্বোচ্চ ৮টি প্রোডাক্ট ছবি রাখা যাবে'));
    const files = selectedFiles.slice(0, available);
    if (selectedFiles.length > available) toast.error(tr(`Only ${available} more image(s) can be added`, `আর মাত্র ${available}টি ছবি যোগ করা যাবে`));
    const queued = files.map((file, index) => {
      const id = `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file); previewUrlsRef.current.add(previewUrl);
      return { file, job: { id, name: file.name, previewUrl, originalBytes: file.size, progress: 0, status: 'queued' as const } };
    });
    setImageJobs((current) => [...current, ...queued.map((x) => x.job)]);
    for (const item of queued) await processAndUploadFile(item.job.id, item.file);
  };

  const removeImageJob = async (id: string) => {
    const target = imageJobs.find((image) => image.id === id); if (!target || activeStatuses.includes(target.status)) return;
    if (target.path) { await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([target.path]); uploadedPathsRef.current.delete(target.path); }
    URL.revokeObjectURL(target.previewUrl); previewUrlsRef.current.delete(target.previewUrl); setImageJobs((current) => current.filter((image) => image.id !== id));
  };

  const addColor = () => {
    const name = colorName.trim();
    if (!name) return toast.error(tr('Color name is required', 'রঙের নাম আবশ্যক'));
    if (colors.length >= 8) return toast.error(tr('Maximum 8 colors are allowed', 'সর্বোচ্চ ৮টি রঙ যোগ করা যাবে'));
    if (colors.some((c) => c.name.toLowerCase() === name.toLowerCase() || c.hex.toLowerCase() === colorHex.toLowerCase())) return toast.error(tr('This color is already added', 'এই রঙ ইতিমধ্যে যোগ করা আছে'));
    setColors((current) => [...current, { name, hex: colorHex }]); setColorName('');
  };

  const submitHandler = async (values: FormShape) => {
    if (hasActiveImageJobs || hasFailedImageJobs) return toast.error(tr('Finish/remove failed image uploads first', 'আগে ছবি আপলোড শেষ করুন বা ব্যর্থ ছবি সরান'));
    const uploadedUrls = completedImageJobs.map((image) => image.url).filter((url): url is string => Boolean(url));
    const finalImages = [...existingImages, ...uploadedUrls];
    persistUploadedImagesRef.current = true;
    try {
      await onSubmit({
        name: values.name.trim(), slug: values.slug, description: sanitizeRichText(values.description ?? '') || undefined,
        price: values.price, discount_price: values.discount_price && values.discount_price > 0 ? values.discount_price : null,
        category_id: values.subcategory_id, supplier_id: values.supplier_id, sku: values.sku?.trim() || null,
        stock_quantity: values.stock_quantity, images: finalImages, colors,
        is_active: product?.is_active ?? true,
      });
      const removedPaths = (product?.images ?? []).filter((url) => !existingImages.includes(url)).map(productImagePathFromUrl).filter((path): path is string => Boolean(path));
      if (removedPaths.length) void supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(removedPaths);
    } catch (error) { persistUploadedImagesRef.current = false; throw error; }
  };

  const handleClose = () => { if (isBusy) return toast.error(tr('Please wait for the current operation to finish', 'চলমান কাজ শেষ হওয়া পর্যন্ত অপেক্ষা করুন')); onClose(); };

  return (
    <ModalShell onClose={handleClose} maxWidthClass="max-w-3xl" panelClassName="animate-slide-up">
      <h3 className="mb-5 pr-10 font-display text-lg font-bold text-gray-900">{isEdit ? tr('Edit Product', 'প্রোডাক্ট এডিট করুন') : tr('Add New Product', 'নতুন প্রোডাক্ট যোগ করুন')}</h3>
      <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="field-label">{tr('Name', 'নাম')} *</label><input className="input" {...register('name')} />{errors.name && <p className="field-error">{errors.name.message}</p>}</div>
          <div><label className="field-label">{tr('Slug (URL)', 'স্লাগ (URL)')} *</label><input className="input" {...register('slug')} />{errors.slug && <p className="field-error">{errors.slug.message}</p>}</div>
        </div>
        <div><label className="field-label">{tr('Description', 'বিবরণ')}</label><Controller name="description" control={control} render={({ field }) => <RichTextEditor value={field.value ?? ''} onChange={field.onChange} maxWords={600} error={errors.description?.message} />} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="field-label">{tr('Actual price (৳)', 'আসল দাম (৳)')} *</label><input type="number" step="0.01" className="input" {...register('price')} />{errors.price && <p className="field-error">{errors.price.message}</p>}</div>
          <div><label className="field-label">{tr('Discount price (optional)', 'ডিসকাউন্ট দাম (ঐচ্ছিক)')}</label><input type="number" step="0.01" className="input" {...register('discount_price')} />{errors.discount_price && <p className="field-error">{errors.discount_price.message}</p>}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="field-label">{tr('Category', 'ক্যাটাগরি')} *</label><select className="select" {...register('category_id')}><option value="">-- {tr('Select category', 'ক্যাটাগরি নির্বাচন')} --</option>{rootCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{errors.category_id && <p className="field-error">{errors.category_id.message}</p>}</div>
          <div><label className="field-label">{tr('Sub-category', 'সাব-ক্যাটাগরি')} *</label><select className="select" disabled={!selectedCategoryId} {...register('subcategory_id')}><option value="">-- {tr('Select sub-category', 'সাব-ক্যাটাগরি নির্বাচন')} --</option>{subcategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{errors.subcategory_id && <p className="field-error">{errors.subcategory_id.message}</p>}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="field-label">{tr('Supplier', 'সাপ্লায়ার')} *</label><select className="select" disabled={!selectedSubcategoryId} {...register('supplier_id')}><option value="">-- {tr('Select supplier', 'সাপ্লায়ার নির্বাচন')} --</option>{matchingSuppliers.map((s) => <option key={s.id} value={s.id}>{s.institution_name}</option>)}</select>{errors.supplier_id && <p className="field-error">{errors.supplier_id.message}</p>}</div>
          <div><label className="field-label">SKU ({tr('optional', 'ঐচ্ছিক')})</label><input className="input" {...register('sku')} /></div>
        </div>
        <div><label className="field-label">{tr('Stock quantity', 'স্টক পরিমাণ')} *</label><input type="number" className="input" {...register('stock_quantity')} />{errors.stock_quantity && <p className="field-error">{errors.stock_quantity.message}</p>}<p className="mt-1 text-xs text-gray-400">{tr('Any stock increase is recorded against the selected supplier.', 'স্টক বাড়ালে নির্বাচিত সাপ্লায়ারের নামে স্টক হিস্ট্রিতে রেকর্ড হবে।')}</p></div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
          <div className="flex items-center justify-between"><label className="field-label mb-0">{tr('Available colors', 'উপলব্ধ রঙ')}</label><span className="text-xs text-gray-400">{colors.length}/8</span></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input className="input" value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder={tr('Color name e.g. Red', 'রঙের নাম, যেমন Red')} /><input type="color" className="h-11 w-16 rounded-xl border border-gray-200 bg-white p-1" value={colorHex} onChange={(e) => setColorHex(e.target.value)} /><button type="button" className="btn-outline" onClick={addColor} disabled={colors.length >= 8}>+ {tr('Add', 'যোগ')}</button></div>
          {colors.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{colors.map((color, i) => <button type="button" title={tr('Click to remove', 'সরাতে ক্লিক করুন')} key={`${color.name}-${i}`} onClick={() => setColors((c) => c.filter((_, x) => x !== i))} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs"><span className="h-4 w-4 rounded-full border" style={{ backgroundColor: color.hex }} />{color.name}<span className="text-red-500">×</span></button>)}</div>}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3"><label className="field-label mb-0">{tr('Product images', 'প্রোডাক্ট ছবি')}</label><span className="text-[11px] text-gray-400">JPG / JPEG / PNG · {tr('max 8', 'সর্বোচ্চ ৮টি')}</span></div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple className="hidden" onChange={handleImageSelection} />
          <button type="button" className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/70 px-4 py-5 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/40 disabled:opacity-55" onClick={() => fileInputRef.current?.click()} disabled={isBusy || remainingImageSlots === 0}>
            <div className="text-sm font-semibold text-gray-700">{hasActiveImageJobs ? tr('Compressing and uploading...', 'কমপ্রেস ও আপলোড হচ্ছে...') : remainingImageSlots === 0 ? tr('Maximum 8 images added', 'সর্বোচ্চ ৮টি ছবি যোগ হয়েছে') : tr('Select / upload images', 'ছবি নির্বাচন / আপলোড করুন')}</div>
            <div className="mt-1 text-xs text-gray-500">{tr('Each image is automatically converted/compressed to 40KB or less before upload.', 'প্রতিটি ছবি আপলোডের আগে স্বয়ংক্রিয়ভাবে 40KB বা কমে কনভার্ট/কমপ্রেস হবে।')}</div>
          </button>
          {imageJobs.length > 0 && <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3"><div className="flex justify-between text-xs"><span>{hasFailedImageJobs ? tr('Some images failed', 'কিছু ছবি ব্যর্থ') : hasActiveImageJobs ? tr('Preparing images...', 'ছবি প্রস্তুত হচ্ছে...') : tr('Upload complete', 'আপলোড সম্পন্ন')}</span><b>{overallImageProgress}%</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full ${hasFailedImageJobs ? 'bg-red-500' : 'bg-primary-600'}`} style={{ width: `${overallImageProgress}%` }} /></div></div>}
          {(existingImages.length > 0 || imageJobs.length > 0) && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{existingImages.map((url) => <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border"><img src={url} alt="Product" className="h-full w-full object-cover" /><button type="button" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-600 shadow" onClick={() => setExistingImages((current) => current.filter((image) => image !== url))}>×</button></div>)}{imageJobs.map((image) => <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl border"><img src={image.previewUrl} alt={image.name} className="h-full w-full object-cover" />{!activeStatuses.includes(image.status) && <button type="button" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-600 shadow" onClick={() => void removeImageJob(image.id)}>×</button>}<div className="absolute inset-x-1 bottom-1 rounded bg-black/70 p-1 text-[9px] text-white">{statusLabel(image.status, tr)} {image.status === 'done' && image.compressedBytes != null ? `· ${formatKb(image.compressedBytes)}` : ''}</div></div>)}</div>}
          <div className="mt-2 flex flex-wrap justify-between gap-1 text-[11px] text-gray-500"><span>{tr('Images', 'ছবি')}: {totalImageCount}/{MAX_PRODUCT_IMAGES} · {tr('max each', 'প্রতি ছবি সর্বোচ্চ')} {formatKb(MAX_PRODUCT_IMAGE_BYTES)}</span><span>{tr('Maximum total', 'সর্বোচ্চ মোট')}: {formatKb(MAX_PRODUCT_IMAGES_TOTAL_BYTES)} · {tr('new', 'নতুন')}: {formatKb(totalNewImageBytes)}</span></div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:justify-end"><button type="button" onClick={handleClose} className="btn-ghost border border-gray-200" disabled={isBusy}>{tr('Cancel', 'বাতিল')}</button><button type="submit" disabled={!canSubmit} className="btn-primary disabled:opacity-55">{isBusy && <Spinner className="h-3.5 w-3.5" />}{isSubmitting ? tr('Saving...', 'সেভ হচ্ছে...') : isEdit ? tr('Update', 'আপডেট করুন') : tr('Add', 'যোগ করুন')}</button></div>
      </form>
    </ModalShell>
  );
}
