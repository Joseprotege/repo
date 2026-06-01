import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Clock, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { fetchHelperEarnings, type HelperEarnings } from '../../services/payments';
import { SUPABASE_CONFIGURED } from '../../lib/supabase';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  released:  { label: 'Paid out',     cls: 'bg-emerald-100 text-emerald-700' },
  held:      { label: 'In escrow',    cls: 'bg-amber-100 text-amber-700' },
  pending:   { label: 'Awaiting funding', cls: 'bg-slate-100 text-slate-600' },
  refunded:  { label: 'Refunded',     cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled',    cls: 'bg-slate-100 text-slate-500' },
};

export function EarningsPanel({ userId }: { userId: string }) {
  const [data, setData] = useState<HelperEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!SUPABASE_CONFIGURED) { setLoading(false); return; }
    fetchHelperEarnings(userId).then(res => {
      if (alive) { setData(res); setLoading(false); }
    });
    return () => { alive = false; };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-teal-500" size={24} />
      </div>
    );
  }

  if (!data || data.payouts.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
        <div className="text-5xl mb-3">💸</div>
        <h3 className="font-bold text-slate-800 mb-1">No earnings yet</h3>
        <p className="text-slate-500 text-sm mb-5 max-w-sm mx-auto">
          When you complete paid tasks, your payouts will show up here. Browse open
          tasks and start helping to earn.
        </p>
        <Link to="/browse" className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl transition-colors">
          Browse tasks <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  const stats = [
    { label: 'Total earned',  value: money(data.releasedCents), icon: <Wallet size={20} className="text-emerald-500" />, color: 'bg-emerald-50 border-emerald-100' },
    { label: 'In escrow',     value: money(data.pendingCents),  icon: <Clock size={20} className="text-amber-500" />,    color: 'bg-amber-50 border-amber-100' },
    { label: 'Paid tasks',    value: String(data.completedCount), icon: <CheckCircle2 size={20} className="text-teal-500" />, color: 'bg-teal-50 border-teal-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            {s.icon}
            <div className="text-xl sm:text-3xl font-black text-slate-900 mt-2">{s.value}</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Payout history</h2>
          <p className="text-xs text-slate-500 mt-0.5">Amounts shown are your payout after the platform fee.</p>
        </div>
        <ul className="divide-y divide-slate-100">
          {data.payouts.map(p => {
            const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.pending;
            return (
              <li key={p.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{money(p.helperPayoutCents)}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p.status === 'released' && p.releasedAt
                      ? `Paid ${fmtDate(p.releasedAt)}`
                      : `Created ${fmtDate(p.createdAt)}`}
                    {' · '}from {money(p.amountCents)} total
                  </p>
                </div>
                <Link
                  to={`/chat/${p.offerId}`}
                  className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg px-2.5 py-1.5 transition-colors flex-shrink-0"
                >
                  View task <ArrowRight size={12} />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
