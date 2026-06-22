/**
 * AdminPage — moderation dashboard. Admin-only (gated on currentUser.isAdmin,
 * and every action is re-verified server-side by the admin-actions function).
 * Lists user reports, lets a moderator triage status, remove listings, and
 * suspend users.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  ShieldAlert, Loader2, ExternalLink, Ban, Trash2, RotateCcw,
  CheckCircle2, XCircle, Eye, Flag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { notify } from '../lib/notify';
import {
  fetchReports, fetchReportStats, updateReport,
  setListingRemoved, setUserSuspended,
  type AdminReport, type ReportStatus, type ReportStats,
} from '../services/admin';

const STATUS_TABS: { value: ReportStatus; label: string }[] = [
  { value: 'open',      label: 'Open' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'resolved',  label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam', scam: 'Scam / fraud', harassment: 'Harassment',
  inappropriate: 'Inappropriate', unsafe: 'Unsafe / illegal',
  impersonation: 'Impersonation', other: 'Other',
};

export const AdminPage: React.FC = () => {
  const { currentUser } = useApp();
  const [tab, setTab] = useState<ReportStatus>('open');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.all([fetchReports(tab), fetchReportStats()]);
    setReports(r);
    setStats(s);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // Non-admins never see this page (defence-in-depth; server re-checks too).
  if (!currentUser.isAdmin) return <Navigate to="/" replace />;

  const onSetStatus = async (report: AdminReport, status: ReportStatus) => {
    setBusyId(report.id);
    const { ok, error } = await updateReport(report.id, status);
    setBusyId(null);
    if (!ok) { notify.error(error ?? 'Could not update report'); return; }
    notify.success(`Report marked ${status}`);
    load();
  };

  const onRemoveListing = async (report: AdminReport, removed: boolean) => {
    setBusyId(report.id);
    const { ok, error } = await setListingRemoved(report.target_id, removed);
    setBusyId(null);
    if (!ok) { notify.error(error ?? 'Action failed'); return; }
    notify.success(removed ? 'Listing removed' : 'Listing restored');
    load();
  };

  const onSuspendUser = async (report: AdminReport, suspend: boolean) => {
    if (!report.target_owner_id) return;
    setBusyId(report.id);
    const { ok, error } = await setUserSuspended(report.target_owner_id, suspend);
    setBusyId(null);
    if (!ok) { notify.error(error ?? 'Action failed'); return; }
    notify.success(suspend ? 'User suspended' : 'User reinstated');
    load();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-1">
        <ShieldAlert className="text-teal-600" size={26} />
        <h1 className="text-2xl font-black text-slate-900">Moderation</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Review reports filed by the community and take action.
      </p>

      {/* Status tabs with counts */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors
              ${tab === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
            {stats && stats[t.value] > 0 && (
              <span className={`ml-1.5 text-xs ${t.value === 'open' ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                {stats[t.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={28} />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20">
          <Flag className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500 font-semibold">No {tab} reports</p>
          <p className="text-sm text-slate-400">Nothing to review here right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(r => (
            <ReportCard
              key={r.id}
              report={r}
              busy={busyId === r.id}
              onSetStatus={onSetStatus}
              onRemoveListing={onRemoveListing}
              onSuspendUser={onSuspendUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Single report card ─────────────────────────────────────────────────────────

const ReportCard: React.FC<{
  report: AdminReport;
  busy: boolean;
  onSetStatus: (r: AdminReport, s: ReportStatus) => void;
  onRemoveListing: (r: AdminReport, removed: boolean) => void;
  onSuspendUser: (r: AdminReport, suspend: boolean) => void;
}> = ({ report, busy, onSetStatus, onRemoveListing, onSuspendUser }) => {
  const isOpenish = report.status === 'open' || report.status === 'reviewing';

  return (
    <div className="border border-slate-200 rounded-2xl p-5 bg-white">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase tracking-wide font-bold text-slate-400">
              {report.target_type}
            </span>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {REASON_LABELS[report.reason] ?? report.reason}
            </span>
            {report.target_removed && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                {report.target_type === 'profile' ? 'suspended' : 'removed'}
              </span>
            )}
          </div>
          <p className="font-bold text-slate-900 truncate">
            {report.target_link ? (
              <Link to={report.target_link} target="_blank" className="hover:text-teal-600 inline-flex items-center gap-1">
                {report.target_label} <ExternalLink size={13} className="text-slate-400" />
              </Link>
            ) : report.target_label}
          </p>
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {new Date(report.created_at).toLocaleDateString()}
        </span>
      </div>

      {report.details && (
        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 mb-3">
          "{report.details}"
        </p>
      )}

      <p className="text-xs text-slate-400 mb-4">
        Reported by {report.reporter_label}
        {report.resolution_note && <> · Note: {report.resolution_note}</>}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {isOpenish && (
          <>
            {report.status === 'open' && (
              <ActionBtn busy={busy} onClick={() => onSetStatus(report, 'reviewing')} icon={Eye} label="Start review" />
            )}
            <ActionBtn busy={busy} onClick={() => onSetStatus(report, 'resolved')} icon={CheckCircle2}
              label="Resolve" tone="green" />
            <ActionBtn busy={busy} onClick={() => onSetStatus(report, 'dismissed')} icon={XCircle}
              label="Dismiss" />

            {report.target_type === 'listing' && (
              report.target_removed
                ? <ActionBtn busy={busy} onClick={() => onRemoveListing(report, false)} icon={RotateCcw} label="Restore listing" />
                : <ActionBtn busy={busy} onClick={() => onRemoveListing(report, true)} icon={Trash2} label="Remove listing" tone="red" />
            )}

            {report.target_owner_id && (
              report.target_removed && report.target_type === 'profile'
                ? <ActionBtn busy={busy} onClick={() => onSuspendUser(report, false)} icon={RotateCcw} label="Reinstate user" />
                : <ActionBtn busy={busy} onClick={() => onSuspendUser(report, true)} icon={Ban} label="Suspend user" tone="red" />
            )}
          </>
        )}
        {!isOpenish && (
          <ActionBtn busy={busy} onClick={() => onSetStatus(report, 'reviewing')} icon={RotateCcw} label="Reopen" />
        )}
      </div>
    </div>
  );
};

const ActionBtn: React.FC<{
  busy: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  tone?: 'red' | 'green' | 'default';
}> = ({ busy, onClick, icon: Icon, label, tone = 'default' }) => {
  const tones = {
    default: 'border-slate-200 text-slate-600 hover:bg-slate-50',
    red: 'border-red-200 text-red-600 hover:bg-red-50',
    green: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50',
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border
        disabled:opacity-40 transition-colors ${tones[tone]}`}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {label}
    </button>
  );
};
