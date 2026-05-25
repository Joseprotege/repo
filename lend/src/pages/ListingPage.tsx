import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Clock, Eye, Users, Wifi, ArrowLeft, ChevronDown, ChevronUp,
  Share2, Flag, Send,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OfferCard } from '../components/offer/OfferCard';
import { Avatar } from '../components/common/Avatar';
import { ReliabilityMeter } from '../components/common/ReliabilityMeter';
import {
  CategoryBadge, UrgencyBadge, StatusBadge, RemoteBadge, CompletionTypeBadge,
} from '../components/common/Badge';
import type { CompletionType } from '../types';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const ListingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getListingById, getUserById, getOffersByListing, currentUser, acceptOffer, addOffer } = useApp();

  const listing = getListingById(id!);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerMsg, setOfferMsg] = useState('');
  const [offerType, setOfferType] = useState<CompletionType>('assist');
  const [offerAbility, setOfferAbility] = useState(70);
  const [offerAvail, setOfferAvail] = useState(70);
  const [offerHours, setOfferHours] = useState(2);
  const [expandedOffers, setExpandedOffers] = useState(false);
  const [offerSubmitted, setOfferSubmitted] = useState(false);

  if (!listing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-slate-700 mb-4">Task not found</h2>
        <Link to="/browse" className="text-teal-600 font-semibold">Browse all tasks →</Link>
      </div>
    );
  }

  const requester = getUserById(listing.requesterId);
  const offers = getOffersByListing(listing.id);
  const isOwner = listing.requesterId === currentUser.id;
  const alreadyOffered = offers.some(o => o.offererId === currentUser.id);
  const pendingOffers = offers.filter(o => o.status === 'pending');
  const acceptedOffer = listing.acceptedOfferId ? offers.find(o => o.id === listing.acceptedOfferId) : null;

  const handleAccept = (offerId: string) => {
    acceptOffer(offerId, listing.id);
  };

  const handleSubmitOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerMsg.trim()) return;
    addOffer({
      id: `o_new_${Date.now()}`,
      listingId: listing.id,
      offererId: currentUser.id,
      completionType: offerType,
      message: offerMsg,
      selfAbility: offerAbility,
      selfAvailability: offerAvail,
      estimatedHours: offerHours,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      distanceMiles: 0.5,
    });
    setOfferSubmitted(true);
    setShowOfferForm(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-6 group"
      >
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to listings
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero image */}
          {listing.imageUrls[0] && (
            <div className="rounded-2xl overflow-hidden h-64 bg-slate-200 relative">
              <img src={listing.imageUrls[0]} alt={listing.title} className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
                <CategoryBadge category={listing.category} />
                <UrgencyBadge urgency={listing.urgency} />
              </div>
              <div className="absolute top-3 right-3">
                <StatusBadge status={listing.status} />
              </div>
            </div>
          )}

          {/* Title + meta */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-black text-slate-900 leading-tight flex-1">
                {listing.title}
              </h1>
              <div className="flex gap-2 flex-shrink-0">
                <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <Share2 size={16} />
                </button>
                <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <Flag size={16} />
                </button>
              </div>
            </div>

            {/* Badges row */}
            {!listing.imageUrls[0] && (
              <div className="flex flex-wrap gap-2">
                <CategoryBadge category={listing.category} />
                <UrgencyBadge urgency={listing.urgency} />
                <StatusBadge status={listing.status} />
                {listing.canBeRemote && <RemoteBadge />}
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-slate-400" />
                {listing.location.displayName}
                {listing.preferredRadiusMiles > 0 && ` (within ${listing.preferredRadiusMiles} mi)`}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                Est. {listing.estimatedHours}h
              </span>
              {listing.canBeRemote && (
                <span className="flex items-center gap-1.5 text-indigo-600">
                  <Wifi size={14} />
                  Remote OK
                </span>
              )}
              <span className="flex items-center gap-1.5 text-slate-400">
                <Eye size={14} />
                {listing.views} views
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Users size={14} />
                {offers.length} offer{offers.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{listing.description}</p>
            </div>

            {/* Tags */}
            {listing.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {listing.tags.map(tag => (
                  <span key={tag} className="text-sm px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-400">Posted {timeAgo(listing.createdAt)}</p>
          </div>

          {/* Accepted offer highlight */}
          {acceptedOffer && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✅</span>
                <h3 className="font-bold text-emerald-800">Helper Confirmed!</h3>
              </div>
              <OfferCard offer={acceptedOffer} isOwner={false} expanded />
            </div>
          )}

          {/* Offers section */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setExpandedOffers(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900">
                  Offers ({offers.filter(o => o.status !== 'declined').length})
                </h2>
                {pendingOffers.length > 0 && isOwner && (
                  <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                    {pendingOffers.length} pending
                  </span>
                )}
              </div>
              {expandedOffers ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            {expandedOffers && (
              <div className="px-6 pb-6 space-y-4">
                {offers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🙋</div>
                    <p className="text-slate-500 text-sm">No offers yet — be the first to help!</p>
                  </div>
                ) : (
                  offers.map(offer => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      isOwner={isOwner}
                      onAccept={handleAccept}
                      expanded
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Make offer form */}
          {!isOwner && listing.status === 'open' && !alreadyOffered && !offerSubmitted && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowOfferForm(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Send size={16} className="text-teal-600" />
                  <span className="font-bold text-slate-900">Make an Offer</span>
                </div>
                {showOfferForm ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              </button>

              {showOfferForm && (
                <form onSubmit={handleSubmitOffer} className="px-6 pb-6 space-y-5">
                  {/* Offer type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      How do you want to help?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['assist', 'collaborate', 'fully-complete'] as CompletionType[]).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setOfferType(type)}
                          className={`p-3 rounded-xl border text-left transition-all
                            ${offerType === type
                              ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                              : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <CompletionTypeBadge type={type} />
                          <p className="text-xs text-slate-500 mt-1">
                            {type === 'assist' && 'Help alongside the requester'}
                            {type === 'collaborate' && 'Work together as a team'}
                            {type === 'fully-complete' && 'Take ownership of the whole task'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Your message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={offerMsg}
                      onChange={e => setOfferMsg(e.target.value)}
                      placeholder="Tell them about your experience, availability, and why you're a great fit…"
                      rows={4}
                      required
                      className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl resize-none
                        focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Self-assessment sliders */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                        <span>My ability for this task</span>
                        <span className="text-teal-600">{offerAbility}%</span>
                      </label>
                      <input
                        type="range" min={10} max={100} step={5}
                        value={offerAbility}
                        onChange={e => setOfferAbility(+e.target.value)}
                        className="w-full accent-teal-600"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Learning</span><span>Expert</span>
                      </div>
                    </div>
                    <div>
                      <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                        <span>My availability</span>
                        <span className="text-blue-600">{offerAvail}%</span>
                      </label>
                      <input
                        type="range" min={10} max={100} step={5}
                        value={offerAvail}
                        onChange={e => setOfferAvail(+e.target.value)}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Busy</span><span>Very free</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                      <span>Estimated hours needed</span>
                      <span className="text-slate-600">{offerHours}h</span>
                    </label>
                    <input
                      type="range" min={0.5} max={20} step={0.5}
                      value={offerHours}
                      onChange={e => setOfferHours(+e.target.value)}
                      className="w-full accent-slate-600"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                    <strong>Important:</strong> Your self-assessment and actual performance will be compared over time,
                    building your reliability score. Be honest — it benefits everyone, including you.
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-colors
                      flex items-center justify-center gap-2"
                  >
                    <Send size={15} />
                    Submit Offer
                  </button>
                </form>
              )}
            </div>
          )}

          {offerSubmitted && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="font-bold text-emerald-800 mb-1">Offer Submitted!</h3>
              <p className="text-sm text-emerald-700">
                Your offer has been sent. The requester will review it and get back to you.
              </p>
            </div>
          )}

          {alreadyOffered && !offerSubmitted && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center text-sm text-blue-700 font-medium">
              ✓ You've already made an offer on this task
            </div>
          )}
        </div>

        {/* ── SIDEBAR ──────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Requester card */}
          {requester && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Posted by</p>
              <Link to={`/profile/${requester.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity mb-4">
                <Avatar user={requester} size="lg" showOnline />
                <div>
                  <p className="font-bold text-slate-900">{requester.displayName}</p>
                  <p className="text-xs text-slate-400">@{requester.username}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {requester.location.displayName}
                  </p>
                </div>
              </Link>
              <ReliabilityMeter reliability={requester.reliability} showBreakdown />
            </div>
          )}

          {/* Task quick facts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Task Details</p>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Est. time</span>
                <span className="font-semibold">{listing.estimatedHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location</span>
                <span className="font-semibold">{listing.location.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Preferred radius</span>
                <span className="font-semibold">{listing.preferredRadiusMiles} mi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remote OK</span>
                <span className="font-semibold">{listing.canBeRemote ? '✓ Yes' : '✗ No'}</span>
              </div>
              {listing.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Expires</span>
                  <span className="font-semibold">{new Date(listing.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Return the favor */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-5">
            <div className="text-2xl mb-2">🤝</div>
            <h3 className="font-bold text-teal-900 mb-1">Return the Favor</h3>
            <p className="text-xs text-teal-700 leading-relaxed">
              If you help this person out, they might be able to lend a hand back when you need it.
              Great connections form here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
