import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../features/cart/useCart';
import { useUpdateCartQuantity, useRemoveFromCart } from '../features/cart/useCartMutations';
import { usePlaceOrder } from '../features/orders/usePlaceOrder';
import { useDeliveryAddresses, useSaveDeliveryAddress } from '../features/profile/useDeliveryAddresses';
import { BangladeshAddressFields } from '../features/profile/BangladeshAddressFields';
import { useLanguage } from '../contexts/LanguageContext';
import {
  EMPTY_ADDRESS_FORM,
  formatAddress,
  isAddressComplete,
  type AddressFormValue,
} from '../features/profile/bangladeshLocations';
import type { AddressType, UserAddress } from '../types/database.types';
import { PageLoader, EmptyState, Spinner } from '../components/common/ui';

const EMPTY_SAVED_ADDRESSES: UserAddress[] = [];
type AddressSelection = AddressType | 'new';
type SaveDecision = 'ask' | 'yes' | 'no';

export default function CartPage() {
  const { tr } = useLanguage();
  const { data: cart, isLoading } = useCart();
  const updateQuantity = useUpdateCartQuantity();
  const removeItem = useRemoveFromCart();
  const placeOrder = usePlaceOrder();
  const { data, isLoading: addressesLoading } = useDeliveryAddresses();
  const savedAddresses = data ?? EMPTY_SAVED_ADDRESSES;
  const saveAddress = useSaveDeliveryAddress();
  const navigate = useNavigate();

  const [newAddress, setNewAddress] = useState<AddressFormValue>({ ...EMPTY_ADDRESS_FORM });
  const [selectedAddress, setSelectedAddress] = useState<AddressSelection>('new');
  const [saveDecision, setSaveDecision] = useState<SaveDecision>('ask');
  const [saveAs, setSaveAs] = useState<AddressType>('home');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash'>('cod');
  const [transactionId, setTransactionId] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const initializedAddressRef = useRef(false);

  const homeAddress = useMemo(() => savedAddresses.find((item) => item.address_type === 'home'), [savedAddresses]);
  const officeAddress = useMemo(() => savedAddresses.find((item) => item.address_type === 'office'), [savedAddresses]);

  useEffect(() => {
    if (addressesLoading || initializedAddressRef.current) return;
    if (homeAddress) setSelectedAddress('home');
    else if (officeAddress) setSelectedAddress('office');
    else {
      setSelectedAddress('new');
      setSaveAs('home');
      setSaveDecision('ask');
    }
    initializedAddressRef.current = true;
  }, [addressesLoading, homeAddress, officeAddress]);

  if (isLoading) return <PageLoader />;

  if (!cart || cart.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title={tr('Your cart is empty', 'আপনার কার্ট খালি')}
        description={tr('Find something you like and add it to your cart.', 'পছন্দের প্রোডাক্ট খুঁজে কার্টে যোগ করুন।')}
        action={<Link to="/" className="btn-primary btn-sm">{tr('Browse products', 'প্রোডাক্ট দেখুন')}</Link>}
      />
    );
  }

  const invalidItems = cart.filter((item) => !item.product.is_active || !item.product.quantity_available);
  const total = cart.reduce((sum, item) => sum + (item.product.discount_price ?? item.product.price) * item.quantity, 0);
  const selectedSavedAddress = selectedAddress === 'new' ? null : savedAddresses.find((item) => item.address_type === selectedAddress) ?? null;
  const newAddressReady = isAddressComplete(newAddress);
  const shippingAddress = selectedSavedAddress?.address ?? (newAddressReady ? formatAddress(newAddress) : '');
  const checkoutPending = placeOrder.isPending || saveAddress.isPending;
  const waitingForSaveDecision = selectedAddress === 'new' && newAddressReady && saveDecision === 'ask';
  const bkashTransactionMissing = paymentMethod === 'bkash' && transactionId.trim().length === 0;
  const addressLabel = (type: AddressType) => type === 'home' ? tr('Home', 'বাসা') : tr('Office', 'অফিস');

  const selectSavedAddress = (addressType: AddressType) => {
    const saved = savedAddresses.find((item) => item.address_type === addressType);
    if (!saved) return;
    setSelectedAddress(addressType);
    setSaveDecision('no');
  };

  const startNewAddress = () => {
    setSelectedAddress('new');
    setNewAddress({ ...EMPTY_ADDRESS_FORM });
    setSaveDecision('ask');
    setSaveAs(!homeAddress ? 'home' : !officeAddress ? 'office' : 'home');
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress || checkoutPending || waitingForSaveDecision || bkashTransactionMissing) return;
    try {
      if (selectedAddress === 'new' && saveDecision === 'yes') {
        await saveAddress.mutateAsync({ addressType: saveAs, value: newAddress });
      }
      const orderId = await placeOrder.mutateAsync({
        items: cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
        shippingAddress,
        paymentMethod,
        transactionId: paymentMethod === 'bkash' ? transactionId.trim() : undefined,
        referralCode: referralCode.trim() || undefined,
      });
      navigate(`/orders/${orderId}/invoice`);
    } catch {
      // Mutations show their own user-facing toast.
    }
  };

  return (
    <div className="page-shell max-w-4xl">
      <div className="mb-5 sm:mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">{tr('Checkout', 'চেকআউট')}</p>
        <h1 className="section-title mt-1">{tr('Your cart', 'আপনার কার্ট')}</h1>
      </div>

      <div className="mb-6 space-y-3">
        {cart.map((item) => {
          const price = item.product.discount_price ?? item.product.price;
          const problem = !item.product.is_active
            ? tr('This product is no longer available', 'প্রোডাক্টটি আর পাওয়া যাচ্ছে না')
            : !item.product.quantity_available
              ? tr('Requested quantity is unavailable', 'চাওয়া পরিমাণ বর্তমানে পাওয়া যাচ্ছে না')
              : null;

          return (
            <div key={item.id} className="card grid grid-cols-[64px_1fr] gap-3 p-3 sm:grid-cols-[72px_1fr_auto_auto] sm:items-center sm:p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 sm:h-[72px] sm:w-[72px]">
                {item.product.images?.[0] ? (
                  <img src={item.product.images[0]} alt={item.product.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-300">{tr('No image', 'ছবি নেই')}</span>
                )}
              </div>

              <div className="min-w-0">
                <Link to={`/product/${item.product.slug}`} className="block truncate font-semibold text-gray-850 transition-colors hover:text-primary-700">{item.product.name}</Link>
                <div className="mt-1 text-sm text-gray-500">৳{price} × {item.quantity} = <span className="font-semibold text-gray-700">৳{(price * item.quantity).toFixed(2)}</span></div>
                {problem && <div className="mt-1 text-xs font-medium text-red-600">{problem}</div>}
              </div>

              <div className="col-start-2 flex w-fit items-center rounded-lg border border-gray-200 bg-white sm:col-auto">
                <button className="px-3 py-2 text-gray-500 hover:text-primary-700 disabled:opacity-30" disabled={item.quantity <= 1 || updateQuantity.isPending} onClick={() => updateQuantity.mutate({ cartItemId: item.id, quantity: item.quantity - 1 })}>−</button>
                <span className="min-w-[2rem] px-2 text-center text-sm font-semibold">{item.quantity}</span>
                <button className="px-3 py-2 text-gray-500 hover:text-primary-700 disabled:opacity-30" disabled={item.quantity >= 99 || updateQuantity.isPending} onClick={() => updateQuantity.mutate({ cartItemId: item.id, quantity: item.quantity + 1 })}>+</button>
              </div>

              <button onClick={() => removeItem.mutate(item.id)} disabled={removeItem.isPending} className="col-start-2 w-fit text-xs font-semibold text-red-500 hover:text-red-700 hover:underline sm:col-auto">
                {tr('Remove', 'সরান')}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card space-y-5 p-4 sm:p-6">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <label className="field-label mb-0">{tr('Delivery address', 'ডেলিভারি ঠিকানা')}</label>
            <Link to="/addresses" className="text-xs font-semibold text-primary-700 hover:underline">{tr('Manage saved addresses', 'সেভ করা ঠিকানা এডিট করুন')}</Link>
          </div>

          {addressesLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-500"><Spinner className="h-4 w-4" /> {tr('Loading addresses...', 'ঠিকানা লোড হচ্ছে...')}</div>
          ) : (
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {(['home', 'office'] as AddressType[]).map((addressType) => {
                const saved = savedAddresses.find((item) => item.address_type === addressType);
                return (
                  <button
                    key={addressType}
                    type="button"
                    disabled={!saved}
                    onClick={() => selectSavedAddress(addressType)}
                    className={`rounded-xl border px-3 py-3 text-left transition ${selectedAddress === addressType ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-100' : saved ? 'border-gray-200 bg-white hover:border-primary-300' : 'cursor-not-allowed border-dashed border-gray-200 bg-gray-50 text-gray-400'}`}
                  >
                    <span className="block text-sm font-semibold">{addressLabel(addressType)}</span>
                    <span className="mt-1 block line-clamp-2 text-xs">{saved?.address ?? tr('Not saved', 'সেভ করা নেই')}</span>
                  </button>
                );
              })}

              <button type="button" onClick={startNewAddress} className={`rounded-xl border px-3 py-3 text-left transition ${selectedAddress === 'new' ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-100' : 'border-gray-200 bg-white hover:border-primary-300'}`}>
                <span className="block text-sm font-semibold">{tr('New address', 'নতুন ঠিকানা')}</span>
                <span className="mt-1 block text-xs text-gray-500">{tr('Choose division, district, thana/upazila and area/union', 'বিভাগ, জেলা, থানা/উপজেলা ও এলাকা/ইউনিয়ন নির্বাচন করুন')}</span>
              </button>
            </div>
          )}

          {selectedSavedAddress ? (
            <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-3">
              <div className="text-xs font-semibold text-primary-800">{tr(`Selected ${addressLabel(selectedSavedAddress.address_type)} address`, `নির্বাচিত ${addressLabel(selectedSavedAddress.address_type)} ঠিকানা`)}</div>
              <p className="mt-1 text-sm text-gray-700">{selectedSavedAddress.address}</p>
            </div>
          ) : (
            <BangladeshAddressFields idPrefix="checkout-new-address" value={newAddress} disabled={checkoutPending} onChange={(next) => { setNewAddress(next); setSelectedAddress('new'); }} />
          )}

          {selectedAddress === 'new' && newAddressReady && (
            <div className="mt-3 rounded-xl border border-primary-100 bg-primary-50/60 p-3">
              <p className="text-sm font-semibold text-gray-800">{tr('Save this address for future orders?', 'পরবর্তী অর্ডারের জন্য এই ঠিকানাটি সেভ করতে চান?')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={`btn-sm border ${saveDecision === 'yes' ? 'border-primary-700 bg-primary-700 text-white' : 'border-primary-200 bg-white text-primary-700'}`} onClick={() => setSaveDecision('yes')}>{tr('Yes', 'হ্যাঁ')}</button>
                <button type="button" className={`btn-sm border ${saveDecision === 'no' ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-200 bg-white text-gray-600'}`} onClick={() => setSaveDecision('no')}>{tr('No', 'না')}</button>
              </div>

              {saveDecision === 'yes' && (
                <div className="mt-3">
                  <label className="field-label">{tr('Save as', 'কোন নামে সেভ করবেন?')}</label>
                  <select className="select" value={saveAs} onChange={(event) => setSaveAs(event.target.value as AddressType)}>
                    <option value="home">{tr(`Home${homeAddress ? ' — replaces saved home address' : ''}`, `বাসা${homeAddress ? ' — আগের ঠিকানা আপডেট হবে' : ''}`)}</option>
                    <option value="office">{tr(`Office${officeAddress ? ' — replaces saved office address' : ''}`, `অফিস${officeAddress ? ' — আগের ঠিকানা আপডেট হবে' : ''}`)}</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">{tr('You can keep up to two saved addresses: Home and Office.', 'প্রতি user-এর সর্বোচ্চ ২টি slot: বাসা ও অফিস।')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="field-label">{tr('Payment method', 'পেমেন্ট পদ্ধতি')}</label>
          <select
            className="select"
            value={paymentMethod}
            onChange={(event) => {
              const next = event.target.value as 'cod' | 'bkash';
              setPaymentMethod(next);
              if (next !== 'bkash') setTransactionId('');
            }}
          >
            <option value="cod">{tr('Cash on Delivery', 'ক্যাশ অন ডেলিভারি')}</option>
            <option value="bkash">bKash</option>
          </select>
        </div>

        {paymentMethod === 'bkash' && (
          <div className="space-y-2">
            <label className="field-label" htmlFor="bkash-transaction-id">
              {tr('bKash transaction ID', 'বিকাশ ট্রানজেকশন আইডি')} <span className="text-red-600">*</span>
            </label>
            <input
              id="bkash-transaction-id"
              type="text"
              required
              maxLength={100}
              autoComplete="off"
              className={`input ${bkashTransactionMissing ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
              value={transactionId}
              onChange={(event) => setTransactionId(event.target.value)}
              placeholder={tr('Enter the bKash transaction ID', 'বিকাশ ট্রানজেকশন আইডি লিখুন')}
              aria-invalid={bkashTransactionMissing}
            />
            <p className={`text-xs ${bkashTransactionMissing ? 'text-red-600' : 'text-gray-500'}`}>
              {bkashTransactionMissing
                ? tr('Transaction ID is required for bKash checkout.', 'বিকাশে অর্ডার করতে ট্রানজেকশন আইডি অবশ্যই দিতে হবে।')
                : tr('We will use this ID to verify your bKash payment.', 'এই আইডি দিয়ে আপনার বিকাশ পেমেন্ট যাচাই করা হবে।')}
            </p>
          </div>
        )}

        <div>
          <label className="field-label">{tr('Referral code (optional)', 'রেফার কোড (ঐচ্ছিক)')}</label>
          <input type="text" className="input" value={referralCode} onChange={(event) => setReferralCode(event.target.value)} placeholder={tr('Enter if available', 'থাকলে লিখুন')} />
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-lg font-bold">
          <span className="text-gray-700">{tr('Total', 'মোট')}</span>
          <span className="text-primary-700">৳{total.toFixed(2)}</span>
        </div>

        {invalidItems.length > 0 && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{tr('Some items need attention. Update or remove them before placing the order.', 'কিছু আইটেম-এ সমস্যা আছে — অর্ডার করার আগে সেগুলো ঠিক করুন বা কার্ট থেকে সরান।')}</p>
        )}

        <button onClick={handlePlaceOrder} disabled={!shippingAddress || invalidItems.length > 0 || checkoutPending || waitingForSaveDecision || bkashTransactionMissing} className="btn-accent w-full">
          {checkoutPending && <Spinner />}
          {saveAddress.isPending
            ? tr('Saving address...', 'ঠিকানা সেভ হচ্ছে...')
            : placeOrder.isPending
              ? tr('Placing order...', 'অর্ডার জমা হচ্ছে...')
              : waitingForSaveDecision
                ? tr('Choose whether to save this address', 'ঠিকানা সেভ করবেন কি না নির্বাচন করুন')
                : bkashTransactionMissing
                  ? tr('Enter bKash transaction ID', 'বিকাশ ট্রানজেকশন আইডি লিখুন')
                  : paymentMethod === 'bkash'
                    ? tr('Submit order', 'সাবমিট করুন')
                  : tr('Confirm order', 'অর্ডার কনফার্ম করুন')}
        </button>
      </div>
    </div>
  );
}
