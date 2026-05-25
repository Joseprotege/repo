import React from 'react';
import { CheckCircle, XCircle, MapPin, Clock, Star } from 'lucide-react';
import type { Offer } from '../../types';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { ReliabilityMeter } from '../common/ReliabilityMeter';
import { CompletionTypeBadge } from '../common/Badge';

interface Props {
  offer: Offer;
  isOwner?: boolean;
  onAccept?: (offerId: string) => void;
  onDecline?: (offerId: string) => void;
  expanded?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-50 border-amber-200',
  accepted:  'bg-emerald-50 border-emerald-200',
  declined:  'bg-slate-50 border-slate-200 opacity-60',
  withdrawn: 'bg-slate-50 border-slate-200 opacity-50',
  completed: 'bg-blue-50 border-blue-200',
};

export const OfferCard: React.FC<Props> = ({ offer, isOwner, onAccept, onDecline, expanded }) => {
  const { getUserById } = useApp();
  const offerer = getUserById(offer.offererId);
  if (!offerer) return null;

  const diff = offer.selfAbility - offerer.reliability.actualPerformance;
  const diffLabel = offerer.reliability.totalOffers > 0
    ? diff > 10 ? '⚠️ Slightly overestimates' : diff < -10 ? '✅ Underestimates (good sign)' : '✅ Accurate'
    : null;

  return (
    <div className={`rounded-xl border p-4 space-y-4 ${STATUS_STYLES[offer.status] || 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar user={offerer} size="md" showOnline />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800">{offerer.displayName}</span>
              <span className="text-xs text-slate-400">@{offerer.username}</span>
              {offerer.verifiedId && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">✓ ID Verified</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <CompletionTypeBadge type={offer.completionType} showDesc />
              {offer.distanceMiles !== undefined && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={11} /> {offer.distanceMiles.toFixed(1)} mi away
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock size={11} /> ~{offer.estimatedHours}h
              </span>
            </div>
          </div>
        </div>

        {/* Status pill */}
        <div className="flex-shrink-0">
          {offer.status === 'pending' && isOwner && (
            <div className="flex gap-2">
              <button
                onClick={() => onAccept?.(offer.id)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors"
              >
                <CheckCircle size={13} /> Accept
              </button>
              <button
                onClick={() => onDecline?.(offer.id)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-600 rounded-full transition-colors"
              >
                <XCircle size={13} /> Decline
              </button>
            </div>
          )}
          {offer.status === 'accepted' && (
            <span className="text-xs font-bold px-3 py-1.5 bg-emerald-600 text-white rounded-full flex items-center gap-1">
              <CheckCircle size={12} /> Accepted
            </span>
          )}
          {offer.status === 'completed' && (
            <span className="text-xs font-bold px-3 py-1.5 bg-blue-600 text-white rounded-full">
              ✓ Completed
            </span>
          )}
          {offer.status === 'declined' && (
            <span className="text-xs font-bold px-3 py-1.5 bg-slate-300 text-slate-600 rounded-full">
              Declined
            </span>
          )}
        </div>
      </div>

      {/* Message */}
      <p className="text-sm text-slate-700 bg-white/60 rounded-lg px-3 py-2 border border-white/80">
        "{offer.message}"
      </p>

      {/* Reliability + self-assessment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Reliability meter */}
        <div className="bg-white/70 rounded-lg p-3 border border-white/80">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Reliability Score</p>
          <ReliabilityMeter reliability={offerer.reliability} compact />
        </div>

        {/* Self-assessment for this task */}
        <div className="bg-white/70 rounded-lg p-3 border border-white/80 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Their Self-Assessment</p>
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                <span>Ability for this task</span>
                <span className="font-bold">{offer.selfAbility}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${offer.selfAbility}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                <span>Availability</span>
                <span className="font-bold">{offer.selfAvailability}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${offer.selfAvailability}%` }} />
              </div>
            </div>
          </div>
          {diffLabel && (
            <p className="text-[11px] text-slate-500 font-medium">{diffLabel}</p>
          )}
        </div>
      </div>

      {/* Skills match */}
      {expanded && offerer.skills.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {offerer.skills.map(s => (
              <span key={s} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Rating (if completed) */}
      {offer.status === 'completed' && offer.ratingByRequester && (
        <div className="bg-white/70 rounded-lg p-3 border border-white/80">
          <p className="text-xs font-semibold text-slate-500 mb-1">Rating after completion</p>
          <div className="flex items-center gap-1 mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < offer.ratingByRequester! ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
              />
            ))}
            <span className="text-xs text-slate-600 ml-1">{offer.ratingByRequester}/5</span>
          </div>
          {offer.ratingNoteByRequester && (
            <p className="text-xs text-slate-600 italic">"{offer.ratingNoteByRequester}"</p>
          )}
        </div>
      )}

      {/* Return the favor */}
      {offer.returnFavorPending && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-base">🤝</span>
          <div>
            <p className="text-xs font-semibold text-amber-800">Return the Favor</p>
            <p className="text-xs text-amber-700">This person may reach out when they need help. Keep the connection strong!</p>
          </div>
        </div>
      )}
    </div>
  );
};
