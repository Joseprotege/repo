import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import type { CommunityBroadcast, Category } from '../../types';
import { useApp } from '../../context/AppContext';

// ─── Category emoji map ───────────────────────────────────────────────────────

const CAT_EMOJI: Record<Category, string> = {
  'home-repairs':   '🔧',
  'tech-help':      '💻',
  'transportation': '🚗',
  'education':      '📚',
  'creative':       '🎨',
  'errands':        '🛒',
  'caregiving':     '🤝',
  'outdoors':       '🌿',
  'financial':      '💰',
  'other':          '✨',
};

// ─── Time formatting ──────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ─── Reaction button ──────────────────────────────────────────────────────────

const REACTIONS: { key: 'heart' | 'clap' | 'spark'; emoji: string; label: string }[] = [
  { key: 'heart', emoji: '❤️', label: 'Lovely' },
  { key: 'clap',  emoji: '👏', label: 'Great' },
  { key: 'spark', emoji: '✨', label: 'Inspiring' },
];

interface BroadcastCardProps {
  broadcast: CommunityBroadcast;
  /** compact = for the notification dropdown; false = full home-page card */
  compact?: boolean;
}

export const BroadcastCard: React.FC<BroadcastCardProps> = ({ broadcast, compact = false }) => {
  const { reactToBroadcast } = useApp();
  const total = broadcast.reactions.heart + broadcast.reactions.clap + broadcast.reactions.spark;

  if (compact) {
    return (
      <div className="px-4 py-3 hover:bg-amber-50/50 transition-colors">
        <div className="flex items-start gap-2">
          {/* Pin dot */}
          <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-base leading-none">{CAT_EMOJI[broadcast.category]}</span>
              <span className="text-[11px] font-semibold text-amber-700 truncate">{broadcast.areaLabel}</span>
              <span className="text-[10px] text-slate-400 ml-auto whitespace-nowrap">{timeAgo(broadcast.completedAt)}</span>
            </div>
            <p className="text-xs text-slate-700 leading-snug">{broadcast.message}</p>
            {broadcast.note && (
              <p className="text-[11px] text-slate-500 italic mt-1 leading-snug">
                "{broadcast.note}"
              </p>
            )}
            {/* Compact reactions — read-only summary */}
            {total > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                {REACTIONS.filter(r => broadcast.reactions[r.key] > 0).map(r => (
                  <span key={r.key} className="text-[11px] text-slate-500 flex items-center gap-0.5">
                    {r.emoji} {broadcast.reactions[r.key]}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-100 p-5 space-y-3 card-hover
      shadow-sm hover:border-amber-200 hover:shadow-amber-50">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl flex-shrink-0">
            {CAT_EMOJI[broadcast.category]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-700">{broadcast.areaLabel}</span>
            </div>
            <span className="text-[11px] text-slate-400">{timeAgo(broadcast.completedAt)}</span>
          </div>
        </div>
        {total > 0 && (
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {total} {total === 1 ? 'reaction' : 'reactions'}
          </span>
        )}
      </div>

      {/* Message */}
      <p className="text-sm text-slate-800 font-medium leading-relaxed">{broadcast.message}</p>

      {/* Note — if one was left */}
      {broadcast.note && (
        <div className="bg-amber-50 border-l-2 border-amber-300 pl-3 py-1.5">
          <p className="text-xs text-amber-900 italic leading-relaxed">
            "{broadcast.note}"
          </p>
        </div>
      )}

      {/* Reaction row */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-2">
          {REACTIONS.map(r => {
            const isActive = broadcast.myReaction === r.key;
            const count = broadcast.reactions[r.key];
            return (
              <button
                key={r.key}
                onClick={() => reactToBroadcast(broadcast.id, r.key)}
                title={r.label}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border transition-all
                  ${isActive
                    ? 'bg-amber-100 border-amber-300 text-amber-800 font-semibold scale-105'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'}`}
              >
                <span className="text-sm leading-none">{r.emoji}</span>
                {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Soft CTA — "inspired?" */}
        <Link
          to="/browse"
          className="text-[11px] text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1 group"
        >
          <span className="hidden sm:inline">Something stir?</span>
          <span className="sm:hidden">Browse nearby</span>
          <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

// ─── Full Pulse feed ──────────────────────────────────────────────────────────

interface PulseProps {
  /** How many to show before "Show more" */
  initialCount?: number;
}

export const CommunityPulse: React.FC<PulseProps> = ({ initialCount = 4 }) => {
  const { broadcasts } = useApp();
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? broadcasts : broadcasts.slice(0, initialCount);
  const hidden = broadcasts.length - initialCount;

  return (
    <div className="space-y-4">
      {visible.map(b => (
        <BroadcastCard key={b.id} broadcast={b} />
      ))}
      {!showAll && hidden > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 text-sm font-semibold text-amber-700 hover:text-amber-800
            bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
        >
          Show {hidden} more nearby wins ↓
        </button>
      )}
    </div>
  );
};

// ─── Auto-generate a broadcast message for a given category ──────────────────

const CATEGORY_MESSAGES: Record<Category, string[]> = {
  'home-repairs':   [
    'Something around the house got fixed — a neighbor came through 🔧',
    'A repair that had been waiting got done, thanks to someone nearby 🛠️',
  ],
  'tech-help':      [
    'A tech issue got sorted — neighbor saved the day 💻',
    'Someone nearby helped get a device or project working again 💡',
  ],
  'transportation': [
    'A neighbor got a ride when they needed one 🚗',
    'Someone offered a lift and came through — just like that 🛣️',
  ],
  'education':      [
    'Someone nearby helped a neighbor learn something — or learn it better 📚',
    'Time was given freely to help someone grow 🎓',
  ],
  'creative':       [
    'A creative project got a boost from a neighbor with skill 🎨',
    'Two people in the same area made something better together ✏️',
  ],
  'errands':        [
    'Errands got covered for someone who needed a hand 🛒',
    'A small but real thing got done — neighbor took care of it ✅',
  ],
  'caregiving':     [
    'Someone looked after another person\'s world for a while 🤝',
    'Care was given freely and received gratefully nearby 🌸',
  ],
  'outdoors':       [
    'An outdoor project got hands-on help from someone close by 🌿',
    'Something outside got done — together it was easier 🌳',
  ],
  'financial':      [
    'A financial question got answered by a knowledgeable neighbor 💰',
    'Someone shared what they know to help a neighbor sort their finances 📊',
  ],
  'other':          [
    'Something good happened nearby — a neighbor stepped up ✨',
    'Two people connected and one helped the other. That\'s it. That\'s everything 🤍',
  ],
};

export function generateBroadcastMessage(category: Category): string {
  const options = CATEGORY_MESSAGES[category];
  return options[Math.floor(Math.random() * options.length)];
}
