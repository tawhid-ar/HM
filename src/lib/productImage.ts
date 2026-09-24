import { supabase } from './supabase';

export const PRODUCT_IMAGE_BUCKET = 'product-images';
export const MAX_PRODUCT_IMAGES = 8;
export const MAX_PRODUCT_IMAGE_BYTES = 40 * 1024;
export const MAX_PRODUCT_IMAGES_TOTAL_BYTES = MAX_PRODUCT_IMAGES * MAX_PRODUCT_IMAGE_BYTES;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

type ProgressCallback = (percent: number) => void;

function extensionForType(type: string) {
  return type === 'image/png' ? 'png' : 'jpg';
}

function safeProgress(callback: ProgressCallback | undefined, value: number) {
  callback?.(Math.max(0, Math.min(100, Math.round(value))));
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('ছবিটি পড়া যায়নি'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('ছবি কমপ্রেস করা যায়নি'))),
      type,
      quality,
    );
  });
}

function fileNameForOutput(originalName: string, type: string) {
  const baseName = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-') || 'product';
  return `${baseName}.${extensionForType(type)}`;
}

/**
 * Converts an uploaded JPG/JPEG/PNG to <= 40KB before it ever reaches Storage.
 * Large PNGs are converted to JPEG when needed because JPEG can reliably hit
 * the 40KB ceiling while preserving a useful product-photo preview.
 */
export async function compressProductImage(file: File, onProgress?: ProgressCallback): Promise<File> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('শুধু JPG, JPEG অথবা PNG ছবি আপলোড করা যাবে');
  }

  safeProgress(onProgress, 4);

  if (file.size <= MAX_PRODUCT_IMAGE_BYTES) {
    safeProgress(onProgress, 100);
    return file;
  }

  const image = await loadImage(file);
  safeProgress(onProgress, 12);

  // Starting below full camera resolution keeps memory use reasonable even for
  // 10MB+ phone photos and gives the encoder a realistic path to <= 40KB.
  const maxInitialDimension = 1800;
  const initialScale = Math.min(1, maxInitialDimension / Math.max(image.naturalWidth, image.naturalHeight));
  let width = Math.max(1, Math.round(image.naturalWidth * initialScale));
  let height = Math.max(1, Math.round(image.naturalHeight * initialScale));

  // Preserve a small PNG that can already fit the target; otherwise convert to
  // JPEG so transparent/complex PNGs can still be compressed under 40KB.
  const outputType = 'image/jpeg';
  let bestBlob: Blob | null = null;

  for (let resizeRound = 0; resizeRound < 12; resizeRound += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('এই ব্রাউজারে ছবি প্রসেস করা যাচ্ছে না');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    let low = 0.1;
    let high = 0.86;
    let fittingBlob: Blob | null = null;

    // Binary-search JPEG quality at this resolution. This gets the best quality
    // we can while respecting the hard 40KB limit.
    for (let qualityRound = 0; qualityRound < 7; qualityRound += 1) {
      const quality = (low + high) / 2;
      const blob = await canvasToBlob(canvas, outputType, quality);
      const step = resizeRound * 7 + qualityRound + 1;
      safeProgress(onProgress, 12 + (step / (12 * 7)) * 82);

      if (blob.size <= MAX_PRODUCT_IMAGE_BYTES) {
        fittingBlob = blob;
        bestBlob = blob;
        low = quality;
      } else {
        high = quality;
      }
    }

    if (fittingBlob) {
      safeProgress(onProgress, 100);
      return new File([fittingBlob], fileNameForOutput(file.name, outputType), {
        type: outputType,
        lastModified: Date.now(),
      });
    }

    // Quality alone was not enough; reduce dimensions and try again.
    width = Math.max(1, Math.round(width * 0.78));
    height = Math.max(1, Math.round(height * 0.78));

    if (Math.max(width, height) <= 120) break;
  }

  if (bestBlob && bestBlob.size <= MAX_PRODUCT_IMAGE_BYTES) {
    safeProgress(onProgress, 100);
    return new File([bestBlob], fileNameForOutput(file.name, outputType), {
      type: outputType,
      lastModified: Date.now(),
    });
  }

  throw new Error('ছবিটি 40KB-এর মধ্যে আনা যায়নি। অন্য ছবি ব্যবহার করুন।');
}

export async function uploadProductImage(file: File, userId: string) {
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error('কমপ্রেস করা ছবির সাইজ 40KB-এর বেশি');
  }

  const ext = extensionForType(file.type);
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/${Date.now()}-${randomId}.${ext}`;

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export function productImagePathFromUrl(url: string) {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  const encoded = url.slice(index + marker.length).split('?')[0];
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}
