/**
 * DangerZoneCard — shown on the profile page (own profile only).
 *
 * Lets the user permanently delete their account. Deletion requires typing
 * their username to confirm, then calls the delete-account Edge Function
 * (which refuses while a payment is held in escrow), signs out, and
 * redirects home.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Loader2, AlertTriangle, X } from 'lucide-react';
import { deleteAccount } from '../../services/profiles';
import { useAuth } from '../../context/AuthContext';

interface DangerZoneCardProps {
  username: string;
}

export const DangerZoneCard: React.FC<DangerZoneCardProps> = ({ username }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = confirmText.trim() === username;

  const handleDelete = async () => {
    if (!confirmed || deleting) return;
    setDeleting(true);
    setError(null);
    const { ok, error: err } = await deleteAccount();
    if (!ok) {
      setError(err ?? 'Could not delete your account. Please try again.');
      setDeleting(false);
      return;
    }
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <>
      <div className="bg-white border border-red-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 mb-0.5">Delete account</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Permanently removes your profile, tasks, offers, and messages.
              This cannot be undone. Any payment still held in escrow must be
              completed or cancelled first.
            </p>
            <button
              onClick={() => { setModalOpen(true); setConfirmText(''); setError(null); }}
              className="inline-flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50
                font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              <Trash2 size={14} />
              Delete my account
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !deleting && setModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <p className="font-black text-slate-900">Delete account?</p>
              <button
                onClick={() => setModalOpen(false)}
                disabled={deleting}
                aria-label="Close"
                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                This permanently deletes your profile, tasks, offers, messages,
                and reliability history. It cannot be undone.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Type <span className="font-bold text-slate-900">{username}</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  disabled={deleting}
                  autoComplete="off"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                  placeholder={username}
                />
              </div>

              {error && (
                <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white
                    border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!confirmed || deleting}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700
                    disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
