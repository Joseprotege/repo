/**
 * StripeConnectCard — shown on the profile page (own profile only).
 *
 * Lets helpers connect a Stripe Express account so they can receive payouts.
 * Tracks 3 states:
 *   - not_connected:   No Stripe account yet → "Connect with Stripe" button
 *   - pending:         Account exists but not fully onboarded → "Resume onboarding"
 *   - active:          Onboarded and capable of receiving payouts → ✓ status
 */
import React, { useEffect, useState } from 'react';
import { Loader2, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fetchStripeStatus, startHelperOnboarding } from '../../services/payments';
import type { StripeAccountStatus } from '../../services/payments';
import { STRIPE_CONFIGURED } from '../../lib/stripe';

interface StripeConnectCardProps {
  userId: string;
}

export const StripeConnectCard: React.FC<StripeConnectCardProps> = ({ userId }) => {
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchStripeStatus(userId).then(s => {
      if (!mounted) return;
      setStatus(s);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [userId]);

  const onboard = async () => {
    setRedirecting(true);
    setError(null);
    const here = window.location.href;
    const { url, error: err } = await startHelperOnboarding({
      returnUrl: here,
      refreshUrl: here,
    });
    if (err || !url) {
      setError(err ?? 'Could not generate onboarding link');
      setRedirecting(false);
      return;
    }
    window.location.href = url;
  };

  // Stripe not configured in this environment — show a friendly placeholder
  if (!STRIPE_CONFIGURED) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💳</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-700 mb-0.5">Payouts via Stripe</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Stripe Connect isn't configured for this environment yet. Once it is,
              you'll be able to connect a Stripe account and receive payouts for
              paid tasks here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <Loader2 size={18} className="animate-spin text-slate-400 mx-auto" />
      </div>
    );
  }

  const isActive  = status?.onboarded && status?.payoutsEnabled;
  const isPending = !!status?.accountId && !isActive;

  return (
    <div className={`rounded-2xl border p-5 mb-6
      ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}
    `}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
          ${isActive ? 'bg-emerald-100' : 'bg-violet-100'}
        `}>
          {isActive
            ? <CheckCircle2 size={20} className="text-emerald-600" />
            : <span className="text-lg">💳</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 mb-0.5">
            {isActive
              ? 'Stripe payouts enabled'
              : isPending
                ? 'Finish setting up payouts'
                : 'Receive payouts from paid tasks'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            {isActive
              ? "Your Stripe account is connected. Payouts from completed paid tasks will land in your bank account."
              : isPending
                ? "You started onboarding but haven't finished. Resume to enable payouts."
                : "Connect a Stripe account once so listers can pay you for paid tasks. Volunteer tasks don't require this."}
          </p>

          {!isActive && (
            <button
              onClick={onboard}
              disabled={redirecting}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50
                text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              {redirecting
                ? <Loader2 size={14} className="animate-spin" />
                : <ExternalLink size={14} />}
              {isPending ? 'Resume Stripe onboarding' : 'Connect with Stripe'}
            </button>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
