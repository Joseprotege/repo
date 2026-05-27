import React, { useState } from 'react';
import { X, Star, Send, Loader2 } from 'lucide-react';

interface Props {
  /** Who is being rated — drives the modal copy. */
  subject: { displayName: string };
  /** Whether the rater is the listing requester or the helper offering on it. */
  raterRole: 'requester' | 'helper';
  onClose: () => void;
  onSubmit: (rating: number, note: string) => void;
}

const STAR_LABELS = ['', 'Not great', 'Below expectations', 'Solid', 'Great', 'Outstanding'];

export const ReviewModal: React.FC<Props> = ({ subject, raterRole, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const shown = hover || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);
    onSubmit(rating, note.trim());
    setSubmitting(false);
    onClose();
  };

  const heading = raterRole === 'requester'
    ? `How did ${subject.displayName} do?`
    : `How was working with ${subject.displayName}?`;
  const subhead = raterRole === 'requester'
    ? 'Your honest rating helps the community trust the right people.'
    : 'Your honest rating helps the community trust the right people.';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Leave a review</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-500" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <h3 className="font-bold text-slate-900">{heading}</h3>
            <p className="text-sm text-slate-500 mt-1">{subhead}</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                >
                  <Star
                    size={36}
                    className={shown >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold text-slate-700 h-5">
              {shown > 0 ? STAR_LABELS[shown] : 'Tap a star to rate'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Add a note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="What stood out? What could have been better?"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl resize-none
                focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-slate-400 mt-1">{note.length}/300</p>
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
              disabled={rating === 0 || submitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700
                disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Submit review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
