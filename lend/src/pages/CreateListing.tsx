import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ImageUploader } from '../components/common/ImageUploader';
import type { Category, UrgencyLevel, Listing } from '../types';

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'home-repairs',  label: 'Home Repairs',    icon: '🔧' },
  { value: 'tech-help',    label: 'Tech Help',        icon: '💻' },
  { value: 'transportation',label: 'Transportation',  icon: '🚗' },
  { value: 'education',    label: 'Education',        icon: '📚' },
  { value: 'creative',     label: 'Creative',         icon: '🎨' },
  { value: 'errands',      label: 'Errands',          icon: '🛒' },
  { value: 'caregiving',   label: 'Caregiving',       icon: '🤝' },
  { value: 'outdoors',     label: 'Outdoors',         icon: '🌿' },
  { value: 'financial',    label: 'Financial',        icon: '💰' },
  { value: 'other',        label: 'Other',            icon: '❓' },
];

export const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, addListing } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  const [city, setCity] = useState(currentUser.location.city);
  const [radius, setRadius] = useState(15);
  const [canBeRemote, setCanBeRemote] = useState(false);
  const [hours, setHours] = useState(2);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [listingId] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState(1);

  const TOTAL_STEPS = 3;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newListing: Listing = {
      // Use a real UUID so the /listing/:id URL works whether or not Supabase is active.
      // We pass this same ID to the DB insert, so both the optimistic update and the
      // persisted row share the same identifier. ID is captured up-front so any
      // images uploaded during the wizard land in the right subfolder.
      id: listingId,
      requesterId: currentUser.id,
      title,
      description,
      category,
      urgency,
      location: {
        ...currentUser.location,
        city,
        displayName: `${city}, TX`,
      },
      preferredRadiusMiles: radius,
      tags,
      imageUrls,
      status: 'open',
      offerIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      canBeRemote,
      estimatedHours: hours,
      views: 0,
    };
    addListing(newListing);
    navigate(`/listing/${newListing.id}`);
  };

  const step1Valid = title.trim().length >= 10 && description.trim().length >= 20;
  // step2Valid: category always has a default, so step 2 is always valid

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 page-enter">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">Post a Task</h1>
        <p className="text-slate-500 mt-1">Describe what you need help with — your community is ready</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <React.Fragment key={i}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${i + 1 < step ? 'bg-teal-600 text-white' : i + 1 === step ? 'bg-teal-600 text-white ring-4 ring-teal-100' : 'bg-slate-200 text-slate-500'}`}>
              {i + 1 < step ? '✓' : i + 1}
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div className={`flex-1 h-1 rounded-full transition-all ${i + 1 < step ? 'bg-teal-600' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">

          {/* ── STEP 1: Description ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Describe your task</h2>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Task Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Help me move furniture this Saturday"
                  maxLength={100}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-400">Be clear and specific</span>
                  <span className="text-xs text-slate-400">{title.length}/100</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Full Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe exactly what you need done, any requirements, schedule, tools available, compensation offered…"
                  rows={6}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl resize-none
                    focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  The more detail you provide, the better offers you'll attract ({description.length} chars)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Add a tag (press Enter)"
                    className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl
                      focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(t => (
                      <span key={t} className="flex items-center gap-1 text-sm px-3 py-1 bg-teal-100 text-teal-700 rounded-full">
                        #{t}
                        <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))}>
                          <X size={12} className="hover:text-red-500" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Photos <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <ImageUploader
                  bucket="listing-photos"
                  value={imageUrls}
                  onChange={setImageUrls}
                  max={6}
                  subfolder={listingId}
                />
              </div>

              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <Info size={15} className="text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Good titles mention the what + when. "Help moving furniture Saturday afternoon" beats "Help needed".
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Category & details ── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Category & details</h2>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm font-medium transition-all
                        ${category === c.value
                          ? 'border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-500'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
                    >
                      <span>{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Urgency</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as UrgencyLevel[]).map(u => {
                    const colors = {
                      low: 'border-slate-400 bg-slate-50 text-slate-700',
                      medium: 'border-blue-500 bg-blue-50 text-blue-700',
                      high: 'border-orange-500 bg-orange-50 text-orange-700',
                      urgent: 'border-red-500 bg-red-50 text-red-700',
                    };
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUrgency(u)}
                        className={`p-3 rounded-xl border text-sm font-semibold capitalize transition-all
                          ${urgency === u ? `${colors[u]} ring-1` : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      >
                        {u}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                  <span>Estimated hours needed</span>
                  <span className="text-teal-600">{hours}h</span>
                </label>
                <input
                  type="range" min={0.5} max={40} step={0.5}
                  value={hours}
                  onChange={e => setHours(+e.target.value)}
                  className="w-full accent-teal-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>30 min</span><span>40 hours</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl">
                <input
                  type="checkbox"
                  id="remote"
                  checked={canBeRemote}
                  onChange={e => setCanBeRemote(e.target.checked)}
                  className="w-4 h-4 accent-teal-600"
                />
                <div>
                  <label htmlFor="remote" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    This task can be done remotely
                  </label>
                  <p className="text-xs text-slate-400">Opens this up to helpers anywhere, not just nearby</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Location ── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Location & radius</h2>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                  <span>Preferred helper radius</span>
                  <span className="text-teal-600">{radius} miles</span>
                </label>
                <input
                  type="range" min={1} max={100} step={1}
                  value={radius}
                  onChange={e => setRadius(+e.target.value)}
                  className="w-full accent-teal-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1 mile</span><span>100 miles</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Helpers outside this radius will still see your listing but proximity factors into their reliability ranking.
                </p>
              </div>

              {/* Summary preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preview</p>
                <p className="font-semibold text-slate-800">{title || '(no title)'}</p>
                <p className="text-sm text-slate-600 line-clamp-2">{description || '(no description)'}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-600">
                    📍 {city}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-600">
                    ⏱ ~{hours}h
                  </span>
                  {canBeRemote && (
                    <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">🌐 Remote OK</span>
                  )}
                  {tags.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">#{t}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !step1Valid}
              className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl
                transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors"
            >
              <Plus size={16} />
              Post Task
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
