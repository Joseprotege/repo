import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ListingCard } from '../components/listing/ListingCard';
import { CategoryBadge } from '../components/common/Badge';
import type { Category, UrgencyLevel } from '../types';

const CATEGORIES: Category[] = [
  'home-repairs','tech-help','transportation','education',
  'creative','errands','caregiving','outdoors','financial','other',
];

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest First' },
  { value: 'oldest',   label: 'Oldest First' },
  { value: 'urgent',   label: 'Most Urgent' },
  { value: 'offers',   label: 'Most Offers' },
  { value: 'views',    label: 'Most Viewed' },
];

export const Browse: React.FC = () => {
  const { listings, getOffersByListing } = useApp();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(params.get('q') || '');
  const [selectedCats, setSelectedCats] = useState<Category[]>([]);
  const [urgency, setUrgency] = useState<UrgencyLevel | ''>('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(true);
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const toggleCat = (cat: Category) => {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat],
    );
  };

  const filtered = useMemo(() => {
    let result = [...listings];

    if (openOnly) result = result.filter(l => l.status === 'open');
    if (remoteOnly) result = result.filter(l => l.canBeRemote);
    if (urgency) result = result.filter(l => l.urgency === urgency);
    if (selectedCats.length > 0) result = result.filter(l => selectedCats.includes(l.category));

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.tags.some(t => t.toLowerCase().includes(q)) ||
        l.location.city.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === 'views') return b.views - a.views;
      if (sort === 'offers') return getOffersByListing(b.id).length - getOffersByListing(a.id).length;
      if (sort === 'urgent') {
        const URG = { urgent: 4, high: 3, medium: 2, low: 1 };
        return URG[b.urgency] - URG[a.urgency];
      }
      return 0;
    });

    return result;
  }, [listings, openOnly, remoteOnly, urgency, selectedCats, search, sort, getOffersByListing]);

  const clearAll = () => {
    setSearch(''); setSelectedCats([]); setUrgency('');
    setRemoteOnly(false); setOpenOnly(true);
    setParams({});
  };

  const hasFilters = selectedCats.length > 0 || urgency || remoteOnly || !openOnly || search;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">Browse Tasks</h1>
        <p className="text-slate-500 mt-1">Find tasks near you and offer your help</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by task, skill, or location…"
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={15} className="text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="py-3 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700
            focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm cursor-pointer"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border shadow-sm transition-colors
            ${showFilters ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {hasFilters && !showFilters && (
            <span className="w-5 h-5 bg-teal-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {[selectedCats.length > 0, !!urgency, remoteOnly, !openOnly].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm space-y-5">
          {/* Categories */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCat(cat)}
                  className={`transition-all ${selectedCats.includes(cat) ? 'ring-2 ring-teal-500 ring-offset-1' : ''}`}
                >
                  <CategoryBadge category={cat} size="sm" />
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Urgency</p>
            <div className="flex gap-2 flex-wrap">
              {(['', 'low', 'medium', 'high', 'urgent'] as const).map(u => (
                <button
                  key={u}
                  onClick={() => setUrgency(u)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors
                    ${urgency === u
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-teal-400'}`}
                >
                  {u === '' ? 'Any' : u.charAt(0).toUpperCase() + u.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={e => setOpenOnly(e.target.checked)}
                className="w-4 h-4 accent-teal-600"
              />
              <span className="text-sm text-slate-700 font-medium">Open tasks only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={e => setRemoteOnly(e.target.checked)}
                className="w-4 h-4 accent-teal-600"
              />
              <span className="text-sm text-slate-700 font-medium">Remote-friendly only</span>
            </label>
          </div>

          {hasFilters && (
            <button onClick={clearAll} className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
              <X size={13} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center gap-3 mb-5">
        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-800">{filtered.length}</span> task{filtered.length !== 1 ? 's' : ''} found
        </p>
        {search && (
          <span className="text-sm text-slate-400 flex items-center gap-1">
            for "<span className="text-slate-700 font-medium">{search}</span>"
          </span>
        )}
        {selectedCats.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {selectedCats.map(cat => (
              <button key={cat} onClick={() => toggleCat(cat)} className="flex items-center gap-1">
                <CategoryBadge category={cat} size="sm" />
                <X size={11} className="text-slate-400 ml-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No tasks found</h3>
          <p className="text-slate-400 mb-6">Try adjusting your filters or search terms</p>
          <button onClick={clearAll} className="text-teal-600 font-semibold hover:text-teal-700">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
};
