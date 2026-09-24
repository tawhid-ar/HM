import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import logoFull from '../assets/logo-full-transparent.png';
import { Spinner } from '../components/common/ui';
import { normalizeBangladeshPhone } from '../lib/bangladeshPhone';

export default function LoginPage() {
  const { tr } = useLanguage();
  const { session, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // A signed-in account should never remain on the login screen. This also
  // handles restored sessions and login events that finish just before the
  // submit handler changes routes.
  useEffect(() => {
    if (session && mode === 'signin') navigate('/', { replace: true });
  }, [session, mode, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        toast.success(tr('Login successful', 'লগইন সফল হয়েছে'));
        navigate('/', { replace: true });
      } else {
        const normalizedPhone = normalizeBangladeshPhone(phone);
        if (!normalizedPhone) {
          throw new Error(tr('Enter a valid Bangladeshi mobile number (01XXXXXXXXX)', 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)'));
        }
        await signUp(email, password, fullName, normalizedPhone);
        toast.success(tr('Account created. You can log in now.', 'একাউন্ট তৈরি হয়েছে! এখন লগইন করুন।'));
        setMode('signin');
        setPassword('');
        setPhone('');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr('Something went wrong', 'একটি সমস্যা হয়েছে'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="site-container flex min-h-[calc(100vh-68px)] items-center justify-center py-8 sm:py-12 lg:grid lg:grid-cols-2 lg:gap-8">
      <div className="relative hidden min-h-[620px] overflow-hidden rounded-[2rem] bg-hero-gradient p-12 text-white shadow-[0_30px_80px_-45px_rgba(10,63,42,0.7)] lg:flex lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 0, transparent 45%), radial-gradient(circle at 80% 75%, #ffb37a 0, transparent 40%)' }} />
        <div className="relative max-w-sm text-center">
          <img src={logoFull} alt="Hadia Mart" className="mx-auto mb-6 h-40 w-40 drop-shadow-lg" />
          <h2 className="font-display text-3xl font-extrabold">{tr('Welcome to Hadia Mart', 'Hadia Mart-এ স্বাগতম')}</h2>
          <p className="mt-3 text-sm leading-7 text-primary-50/85">{tr('Shop everyday essentials, manage your orders and enjoy a simpler checkout experience.', 'নিত্যপ্রয়োজনীয় পণ্য কিনুন, অর্ডার ট্র্যাক করুন এবং সহজ চেকআউট উপভোগ করুন।')}</p>
        </div>
      </div>

      <div className="w-full max-w-md justify-self-center">
        <div className="mb-6 flex flex-col items-center lg:hidden"><img src={logoFull} alt="Hadia Mart" className="h-24 w-24" /></div>
        <div className="card rounded-3xl p-5 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">Hadia Mart</p>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-gray-950">{mode === 'signin' ? tr('Sign in', 'লগইন করুন') : tr('Create account', 'নতুন একাউন্ট তৈরি করুন')}</h1>
          <p className="mb-6 mt-1 text-sm text-gray-500">{mode === 'signin' ? tr('Access your account securely', 'আপনার একাউন্টে প্রবেশ করুন') : tr('Create your account in a few steps', 'কয়েক ধাপে একাউন্ট তৈরি করুন')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && <div><label className="field-label">{tr('Full name', 'পূর্ণ নাম')}</label><input type="text" required placeholder={tr('Enter your name', 'আপনার নাম লিখুন')} className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>}
            {mode === 'signup' && (
              <div>
                <label className="field-label">{tr('Mobile number', 'মোবাইল নম্বর')}</label>
                <input
                  type="tel"
                  required
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                  className="input"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  pattern="(?:\+?88)?01[3-9][0-9]{8}"
                  title={tr('Use a Bangladeshi mobile number such as 01712345678', 'বাংলাদেশি মোবাইল নম্বর দিন, যেমন 01712345678')}
                />
                <p className="mt-1 text-xs text-gray-400">{tr('Bangladesh mobile only: 01XXXXXXXXX', 'শুধু বাংলাদেশি মোবাইল: 01XXXXXXXXX')}</p>
              </div>
            )}
            <div><label className="field-label">{tr('Email', 'ইমেইল')}</label><input type="email" required placeholder="you@example.com" className="input" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <div><label className="field-label">{tr('Password', 'পাসওয়ার্ড')}</label><input type="password" required minLength={6} placeholder={tr('At least 6 characters', 'কমপক্ষে ৬ অক্ষর')} className="input" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            <button disabled={loading} className="btn-primary w-full">{loading && <Spinner />}{loading ? tr('Please wait...', 'অপেক্ষা করুন...') : mode === 'signin' ? tr('Login', 'লগইন') : tr('Create account', 'একাউন্ট তৈরি করুন')}</button>
          </form>

          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="mt-5 w-full text-center text-sm font-semibold text-primary-700 hover:underline">
            {mode === 'signin' ? tr("Don't have an account? Create one", 'একাউন্ট নেই? নতুন তৈরি করুন') : tr('Already have an account? Sign in', 'আগে থেকেই একাউন্ট আছে? লগইন করুন')}
          </button>
        </div>
      </div>
    </div>
  );
}
