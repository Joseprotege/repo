import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SignupPage: React.FC = () => {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!acceptedTerms) { setError('Please accept the Terms of Service to continue.'); return; }
    setLoading(true);
    const { error } = await signUp(email, password, displayName);
    setLoading(false);
    if (error) { setError(error); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Check your email</h2>
          <p className="text-slate-500 text-sm mb-6">
            We sent a confirmation link to <strong>{email}</strong>.<br />
            Click it to activate your account, then sign in.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white
              font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-xl leading-none">F</span>
            </div>
            <span className="text-2xl font-black text-slate-900">Foster</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-2xl font-black text-slate-900 mb-1">Create your account</h1>
          <p className="text-slate-500 text-sm mb-6">Join Foster and start helping your neighborhood</p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Your name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                placeholder="e.g. Alex Rivera"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                  focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                  focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Minimum 8 characters</p>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-teal-600"
              />
              <span>
                I agree to Foster's{' '}
                <Link to="/legal/terms" className="text-teal-600 hover:text-teal-700 font-semibold" target="_blank">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/legal/privacy" className="text-teal-600 hover:text-teal-700 font-semibold" target="_blank">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700
                disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
