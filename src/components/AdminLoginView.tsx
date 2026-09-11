import React, { useState } from 'react';
import { ShieldCheck, User, Lock, ArrowLeft, LogIn, CheckCircle } from 'lucide-react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { isAuthorizedAdmin } from '../lib/repository';
import { PROFILE_INFO } from '../data/initialData';

interface AdminLoginViewProps {
  onLoginSuccess: () => void;
  onReturnToPortfolio: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onReturnToPortfolio,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true); setError('');
    try {
      if (!auth) throw new Error('Login is not configured.');
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!(await isAuthorizedAdmin())) { await signOut(auth); throw new Error('This account is not authorized for admin access.'); }
      onLoginSuccess();
    } catch { setError('Unable to sign in. Check your credentials and admin access.'); }
    finally { setIsLoading(false); }
  };

  return (
    <section
      id="view-admin-login"
      className="min-h-[calc(100vh-80px)] flex items-center justify-center py-16 px-6 bg-[#f1f3ff]"
    >
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-[#c8c4d8] shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#5b4cf0] text-white flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-[#141b2b]">
            Administrative Suite
          </h2>
          <p className="text-xs sm:text-sm text-[#474555]">
            Authorized access for {PROFILE_INFO.name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs sm:text-sm font-semibold text-[#141b2b] mb-1"
            >
              Admin Email
            </label>
            <div className="relative">
              <input
                id="admin-email"
                type="email" autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-[#c8c4d8] bg-white text-[#141b2b] text-sm focus:border-[#5b4cf0] focus:ring-2 focus:ring-[#5b4cf0]/20 focus:outline-none transition-all"
              />
              <User className="w-4 h-4 absolute left-3 top-3.5 text-[#777587]" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="admin-pwd"
                className="block text-xs sm:text-sm font-semibold text-[#141b2b]"
              >
                Security Key / Password
              </label>

            </div>
            <div className="relative">
              <input
                id="admin-pwd"
                type="password" autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-[#c8c4d8] bg-white text-[#141b2b] text-sm focus:border-[#5b4cf0] focus:ring-2 focus:ring-[#5b4cf0]/20 focus:outline-none transition-all"
              />
              <Lock className="w-4 h-4 absolute left-3 top-3.5 text-[#777587]" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#474555]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#422cd8] border-[#c8c4d8] focus:ring-[#422cd8]"
              />
              <span>Remember me on this device</span>
            </label>
          </div>

          <button
            id="btn-admin-submit"
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-lg bg-[#5b4cf0] text-white text-sm font-semibold hover:bg-[#422cd8] transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {isLoading ? (
              <span>Verifying Credentials...</span>
            ) : (
              <>
                <span>Authenticate & Enter Dashboard</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-[#c8c4d8]/40 pt-4 flex items-center justify-between text-xs text-[#474555]">
          <button
            type="button"
            onClick={onReturnToPortfolio}
            className="hover:text-[#422cd8] transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Portfolio</span>
          </button>
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Firebase Authentication</span>
          </span>
        </div>
      </div>
    </section>
  );
};
