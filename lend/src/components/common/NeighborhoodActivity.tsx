import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, CheckCircle, Clock, Zap, ArrowRight } from 'lucide-react';
import type { Category } from '../../types';
import { useApp } from '../../context/AppContext';

const CAT_LABEL: Partial<Record<Category, string>> = {
  'home-repairs': 'Home repairs',
  'tech-help': 'Tech help',
  'transportation': 'Rides',
  'education': 'Tutoring',
  'creative': 'Creative',
  'errands': 'Errands',
  'caregiving': 'Caregiving',
  'outdoors': 'Outdoors',
  'financial': 'Financial',
  'other': 'General',
};

const CAT_EMOJI: Partial<Record<Category, string>> = {
  'home-repairs': '🔧', 'tech-help': '💻', 'transportation': '🚗',
  'education': '📚', 'creative': '🎨', 'errands': '🛒',
  'caregiving': '🤝', 'outdoors': '🌿', 'financial': '💰', 'other': '✨',
};

// A tiny dot-grid that visualises relative activity (out of a max of 40)
const ActivityDots: React.FC<{ value: number; max?: number }> = ({ value, max = 40 }) => {
  const total = 20;
  const filled = Math.min(total, Math.round((value / max) * total));
  return (
    <div className="flex gap-0.5 flex-wrap">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full transition-colors
            ${i < filled ? 'bg-teal-500' : 'bg-slate-100'}`}
        />
      ))}
    </div>
  );
};

/**
 * Compute live activity stats for a neighborhood from listings + broadcasts.
 * Returns null when there's no activity at all (the caller decides what to render).
 */
function useNeighborhoodStats(neighborhood: string) {
  const { listings, offers, broadcasts } = useApp();

  return useMemo(() => {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const inHood = listings.filter(l => l.location.neighborhood === neighborhood);
    if (inHood.length === 0) return null;

    const city = inHood[0]?.location.city ?? '';

    // Unique helpers = unique offer authors on listings in this neighborhood
    const listingIds = new Set(inHood.map(l => l.id));
    const helperIds = new Set(
      offers.filter(o => listingIds.has(o.listingId)).map(o => o.offererId),
    );

    const completedThisMonth = inHood.filter(l =>
      l.status === 'completed' && new Date(l.updatedAt).getTime() > monthAgo,
    ).length;

    const broadcastsThisMonth = broadcasts.filter(b =>
      b.areaLabel.toLowerCase().includes(neighborhood.toLowerCase()) &&
      new Date(b.completedAt).getTime() > monthAgo,
    ).length;

    // Top 3 categories by listing count
    const catCounts = inHood.reduce<Record<string, number>>((acc, l) => {
      acc[l.category] = (acc[l.category] ?? 0) + 1;
      return acc;
    }, {});
    const topCategories = Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([c]) => c as Category);

    return {
      neighborhood,
      city,
      activeHelpers: helperIds.size,
      tasksCompletedMonth: completedThisMonth,
      broadcastsThisMonth,
      topCategories,
    };
  }, [neighborhood, listings, offers, broadcasts]);
}

interface Props {
  neighborhood: string;
  /** If true, renders a compact inline variant */
  compact?: boolean;
}

export const NeighborhoodActivity: React.FC<Props> = ({ neighborhood, compact = false }) => {
  const stats = useNeighborhoodStats(neighborhood);

  if (!stats) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <span className="font-bold text-slate-600">{neighborhood}</span>
          <span>· No activity yet — be the first to post a task here.</span>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5 text-center">
        <div className="text-3xl mb-2">🌱</div>
        <h3 className="text-base font-bold text-slate-800 mb-1">{neighborhood}</h3>
        <p className="text-xs text-slate-500 mb-3">
          This neighborhood is brand new. Post the first task here and start the activity.
        </p>
        <Link
          to="/create"
          className="inline-block text-xs font-semibold text-teal-600 hover:text-teal-700"
        >
          Post a task →
        </Link>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs text-slate-600 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
        <span className="font-bold text-teal-700">{stats.neighborhood}</span>
        <span className="flex items-center gap-1"><Users size={11} className="text-teal-500" />{stats.activeHelpers} active</span>
        <span className="flex items-center gap-1"><CheckCircle size={11} className="text-emerald-500" />{stats.tasksCompletedMonth} done this month</span>
        <span className="flex items-center gap-1"><Zap size={11} className="text-amber-500" />{stats.broadcastsThisMonth} pings</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-base">🏘️</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Neighborhood</span>
          </div>
          <h3 className="text-lg font-black text-slate-900">{stats.neighborhood}</h3>
          {stats.city && <p className="text-xs text-slate-400">{stats.city}</p>}
        </div>
        <Link
          to="/pulse"
          className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-0.5"
        >
          Full pulse <ArrowRight size={12} />
        </Link>
      </div>

      {/* Activity dot grid */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Helper activity this week</span>
          <span className="font-bold text-teal-600">{stats.activeHelpers} active</span>
        </div>
        <ActivityDots value={stats.activeHelpers} max={40} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { icon: <CheckCircle size={14} className="text-emerald-500" />, value: stats.tasksCompletedMonth, label: 'done this month' },
          { icon: <Zap size={14} className="text-amber-500" />,          value: stats.broadcastsThisMonth, label: 'community pings' },
          { icon: <Clock size={14} className="text-blue-400" />,         value: stats.activeHelpers > 0 ? `${stats.activeHelpers}` : '—', label: 'helpers nearby' },
        ].map((s, i) => (
          <div key={i} className="text-center bg-slate-50 rounded-xl p-2.5">
            <div className="flex justify-center mb-1">{s.icon}</div>
            <div className="text-base font-black text-slate-800">{s.value}</div>
            <div className="text-[10px] text-slate-500 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top categories */}
      {stats.topCategories.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Common requests here</p>
          <div className="flex gap-2 flex-wrap">
            {stats.topCategories.map(cat => (
              <span key={cat} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                <span>{CAT_EMOJI[cat]}</span>
                <span>{CAT_LABEL[cat]}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Neighborhood selector strip (used in Browse + Pulse pages) ───────────────

interface SelectorProps {
  selected: string;
  onSelect: (n: string) => void;
  city?: string;
}

export const NeighborhoodSelector: React.FC<SelectorProps> = ({ selected, onSelect, city = 'Austin' }) => {
  const { listings } = useApp();

  // Derive unique neighborhoods + active-helper counts from real listings
  const neighborhoods = useMemo(() => {
    const byHood = new Map<string, number>();
    for (const l of listings) {
      if (l.location.city !== city) continue;
      const n = l.location.neighborhood;
      if (!n) continue;
      byHood.set(n, (byHood.get(n) ?? 0) + 1);
    }
    return Array.from(byHood.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([neighborhood, count]) => ({ neighborhood, count }));
  }, [listings, city]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onSelect('')}
        className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all
          ${selected === '' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'}`}
      >
        All of {city}
      </button>
      {neighborhoods.map(n => (
        <button
          key={n.neighborhood}
          onClick={() => onSelect(n.neighborhood)}
          className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all whitespace-nowrap
            ${selected === n.neighborhood
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'}`}
        >
          {n.neighborhood}
          <span className={`ml-1.5 text-[10px] ${selected === n.neighborhood ? 'text-teal-200' : 'text-slate-400'}`}>
            {n.count}
          </span>
        </button>
      ))}
    </div>
  );
};
