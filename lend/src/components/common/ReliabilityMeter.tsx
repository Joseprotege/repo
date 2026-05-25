import React from 'react';
import type { ReliabilityScore } from '../../types';
import { Shield, Star, TrendingUp, Award } from 'lucide-react';

interface Props {
  reliability: ReliabilityScore;
  compact?: boolean;
  showBreakdown?: boolean;
}

const LEVEL_CONFIG = {
  new:       { label: 'New Member',  color: 'bg-slate-400',   text: 'text-slate-600',   icon: '🌱' },
  rising:    { label: 'Rising',      color: 'bg-blue-400',    text: 'text-blue-700',    icon: '📈' },
  trusted:   { label: 'Trusted',     color: 'bg-teal-500',    text: 'text-teal-700',    icon: '✅' },
  expert:    { label: 'Expert',      color: 'bg-purple-500',  text: 'text-purple-700',  icon: '⭐' },
  legendary: { label: 'Legendary',   color: 'bg-amber-500',   text: 'text-amber-700',   icon: '🏆' },
};

function scoreColor(score: number) {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-teal-500';
  if (score >= 55) return 'bg-amber-400';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-red-400';
}

function scoreLabel(score: number) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Low';
  return 'Very Low';
}

const Bar: React.FC<{ value: number; label: string; sub?: string }> = ({ value, label, sub }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-600 font-medium">{label}</span>
      <span className="text-xs font-bold text-slate-800">{value > 0 ? `${value}%` : '—'}</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${scoreColor(value)}`}
        style={{ width: `${value}%` }}
      />
    </div>
    {sub && <p className="text-xs text-slate-400">{sub}</p>}
  </div>
);

export const ReliabilityMeter: React.FC<Props> = ({ reliability, compact = false, showBreakdown = false }) => {
  const lvl = LEVEL_CONFIG[reliability.level];
  const diff = reliability.actualPerformance - reliability.selfAssessedAbility;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-10 h-10">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle
              cx="20" cy="20" r="16" fill="none"
              stroke={reliability.overall >= 80 ? '#10b981' : reliability.overall >= 60 ? '#f59e0b' : '#ef4444'}
              strokeWidth="4"
              strokeDasharray={`${(reliability.overall / 100) * 100.5} 100.5`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">
            {reliability.overall}
          </span>
        </div>
        <div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lvl.color} text-white`}>
            {lvl.icon} {lvl.label}
          </span>
          <div className="text-xs text-slate-500 mt-0.5">
            {reliability.avgRating > 0 ? `★ ${reliability.avgRating.toFixed(1)}` : 'No ratings yet'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall score ring */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="32" fill="none"
              stroke={reliability.overall >= 80 ? '#10b981' : reliability.overall >= 60 ? '#f59e0b' : '#ef4444'}
              strokeWidth="8"
              strokeDasharray={`${(reliability.overall / 100) * 201.1} 201.1`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-slate-800">{reliability.overall}</span>
            <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide">Score</span>
          </div>
        </div>

        <div className="flex-1">
          <div className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full ${lvl.color} text-white mb-2`}>
            <span>{lvl.icon}</span>
            <span>{lvl.label}</span>
          </div>
          <div className="text-sm text-slate-600 font-medium">{scoreLabel(reliability.overall)} reliability</div>
          <div className="flex items-center gap-1 mt-1">
            <Star size={13} className="text-amber-400 fill-amber-400" />
            <span className="text-sm font-semibold text-slate-700">
              {reliability.avgRating > 0 ? reliability.avgRating.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-slate-400">
              {reliability.totalOffers > 0 ? `(${reliability.completedOffers}/${reliability.totalOffers} tasks done)` : 'No completed tasks yet'}
            </span>
          </div>
        </div>
      </div>

      {showBreakdown && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Score Breakdown</span>
          </div>

          <Bar value={reliability.selfAssessedAbility} label="Self-assessed ability" sub="What they say they can do" />
          <Bar value={reliability.selfAssessedAvailability} label="Self-assessed availability" sub="How available they say they are" />
          <Bar
            value={reliability.actualPerformance}
            label="Actual performance"
            sub={reliability.totalOffers > 0 ? `Based on ${reliability.completedOffers} completed tasks` : 'No completed tasks yet'}
          />

          {reliability.totalOffers > 0 && diff !== 0 && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
              diff >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              <Shield size={12} />
              <span>
                {diff >= 0
                  ? `Performs ${Math.abs(diff)} pts above self-assessment — underestimates themselves!`
                  : `Performs ${Math.abs(diff)} pts below self-assessment — slightly overestimates.`}
              </span>
            </div>
          )}

          {reliability.totalOffers > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Award size={12} className="text-slate-400" />
              <span>{reliability.reliableOffers}/{reliability.totalOffers} offers followed through</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
