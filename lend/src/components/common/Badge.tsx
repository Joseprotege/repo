import React from 'react';
import type { Category, UrgencyLevel, ListingStatus, CompletionType } from '../../types';

// ─── Category Badge ───────────────────────────────────────────────────────────

const CAT_CONFIG: Record<Category, { label: string; icon: string; color: string }> = {
  'home-repairs':  { label: 'Home Repairs',   icon: '🔧', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'tech-help':     { label: 'Tech Help',      icon: '💻', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'transportation':{ label: 'Transportation', icon: '🚗', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  'education':     { label: 'Education',      icon: '📚', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  'creative':      { label: 'Creative',       icon: '🎨', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  'errands':       { label: 'Errands',        icon: '🛒', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'caregiving':    { label: 'Caregiving',     icon: '🤝', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  'outdoors':      { label: 'Outdoors',       icon: '🌿', color: 'bg-green-100 text-green-700 border-green-200' },
  'financial':     { label: 'Financial',      icon: '💰', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'other':         { label: 'Other',          icon: '❓', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const CategoryBadge: React.FC<{ category: Category; size?: 'sm' | 'md' }> = ({ category, size = 'md' }) => {
  const c = CAT_CONFIG[category];
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full font-medium
      ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'} ${c.color}`}>
      <span>{c.icon}</span>
      <span>{c.label}</span>
    </span>
  );
};

// ─── Urgency Badge ────────────────────────────────────────────────────────────

const URG_CONFIG: Record<UrgencyLevel, { label: string; color: string; dot: string }> = {
  low:    { label: 'Low',    color: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  high:   { label: 'High',   color: 'bg-orange-100 text-orange-700',dot: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700',      dot: 'bg-red-500 animate-pulse' },
};

export const UrgencyBadge: React.FC<{ urgency: UrgencyLevel }> = ({ urgency }) => {
  const u = URG_CONFIG[urgency];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${u.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
      {u.label}
    </span>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ListingStatus, { label: string; color: string }> = {
  open:        { label: 'Open',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'in-progress':{ label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed:   { label: 'Completed',   color: 'bg-slate-100 text-slate-600 border-slate-200' },
  closed:      { label: 'Closed',      color: 'bg-red-100 text-red-600 border-red-200' },
};

export const StatusBadge: React.FC<{ status: ListingStatus }> = ({ status }) => {
  const s = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${s.color}`}>
      {s.label}
    </span>
  );
};

// ─── Completion Type Badge ────────────────────────────────────────────────────

const COMP_CONFIG: Record<CompletionType, { label: string; desc: string; color: string; icon: string }> = {
  'assist':          { label: 'Assist',          desc: 'Help alongside',  color: 'bg-sky-100 text-sky-700',     icon: '🤝' },
  'collaborate':     { label: 'Collaborate',     desc: 'Work together',   color: 'bg-violet-100 text-violet-700', icon: '⚡' },
  'fully-complete':  { label: 'Fully Complete',  desc: 'Own the whole task', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
};

export const CompletionTypeBadge: React.FC<{ type: CompletionType; showDesc?: boolean }> = ({ type, showDesc }) => {
  const c = COMP_CONFIG[type];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${c.color}`}>
      <span>{c.icon}</span>
      <span>{c.label}</span>
      {showDesc && <span className="font-normal opacity-75">· {c.desc}</span>}
    </span>
  );
};

// ─── Remote Badge ─────────────────────────────────────────────────────────────

export const RemoteBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
    🌐 Remote OK
  </span>
);
