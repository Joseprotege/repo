import React, { useState } from 'react';
import { X, Flag, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SUPABASE_CONFIGURED } from '../../lib/supabase';
import { fileReport, type ReportTargetType, type ReportReason } from '../../services/reports';

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
}

const REASONS: { value: ReportReason; label: string; help: string }[] = [
  { value: 'spam',           label: 'Spam or promotional',  help: 'Unwanted ads, duplicate posts, off-topic content.' },
  { value: 'scam',           label: 'Scam or fraud',         help: 'Someone trying to deceive others for money or info.' },
  { value: 'harassment',     label: 'Harassment or abuse',   help: 'Targeted insults, threats, or unwanted contact.' },
  { value: 'inappropriate',  label: 'Inappropriate content', help: 'Hate speech, sexual content, or graphic material.' },
  { value: 'unsafe',         label: 'Unsafe or illegal',     help: 'Activity that could harm someone, or violates the law.' },
  { value: 'impersonation',  label: 'Impersonation',         help: 'Pretending to be someone else.' },
  { value: 'other',          label: 'Something else',        help: "Doesn't fit any of the above." },
];

export const ReportModal: React.FC<Props> = ({ targetType, targetId, onClose }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    if (!user || !SUPABASE_CONFIGURED) {
      setError('You need to be signed in to submit a report.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const ok = await fileReport({
      reporterId: user.id,
      targetType,
      targetId,
      reason,
      details: details.trim(),
    });
    setSubmitting(false);
    if (!ok) {
      setError("Couldn't submit. Try again in a moment.");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Thanks for letting us know</h2>
          <p className="text-sm text-slate-500 mb-5">
            We'll review the report and take action if it violates our community guidelines.
          </p>
          <button
            onClick={onClose}
            className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Flag size={16} className="text-red-500" />
            <h2 className="text-lg font-bold text-slate-900">Report this {targetType}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-500" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Why are you reporting this?</p>
            <div className="space-y-1.5">
              {REASONS.map(r => (
                <label
                  key={r.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                    ${reason === r.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="mt-0.5 accent-teal-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                    <p className="text-xs text-slate-500">{r.help}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Anything else we should know? <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Briefly explain what's going on…"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl resize-none
                focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || submitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-red-600 hover:bg-red-700
                disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
              Submit report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
