import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Clock, Eye, Users, Wifi, ArrowLeft, ChevronDown, ChevronUp,
  Share2, Flag, Send, Sparkles, CheckCircle2, Star, MessageCircle,
  Trash2, Loader2,
} from 'lucide-react';
import { deleteListing } from '../services/listings';
import { listingHasHeldPayment } from '../services/payments';
import { notify } from '../lib/notify';
import { useApp } from '../context/AppContext';
import { OfferCard } from '../components/offer/OfferCard';
import { Avatar } from '../components/common/Avatar';
import { ReliabilityMeter } from '../components/common/ReliabilityMeter';
import {
  CategoryBadge, UrgencyBadge, StatusBadge, RemoteBadge, CompletionTypeBadge,
} from '../components/common/Badge';
import {
  generateBroadcastMessage,
} from '../components/common/CommunityPulse';
import { ReviewModal } from '../components/common/ReviewModal';
import { ReportModal } from '../components/common/ReportModal';
import type { CompletionType } from '../types';
import { NeighborhoodActivity } from '../components/common/NeighborhoodActivity';
import { LIMITS } from '../lib/limits';

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
  const {
    getListingById, getUserById, getOffersByListing, currentUser,
    acceptOffer, addOffer, addBroadcast, completeOffer, rateOffer,
  } = useApp();

  const listing = getListingById(id!);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerMsg, setOfferMsg] = useState('');
  const [offerType, setOfferType] = useState<CompletionType>('assist');
  const [offerAbility, setOfferAbility] = useState(70);
  const [offerAvail, setOfferAvail] = useState(70);
  const [offerHours, setOfferHours] = useState(2);
  const [expandedOffers, setExpandedOffers] = useState(false);
  const [offerSubmitted, setOfferSubmitted] = useState(false);
  // Community broadcast prompt state
  const [showBroadcastPrompt, setShowBroadcastPrompt] = useState(false);
  const [broadcastNote, setBroadcastNote] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  // Review modal
  const [reviewOpen, setReviewOpen] = useState(false);
  // Report modal
  const [reportOpen, setReportOpen] = useState(false);
  // Delete task
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteTask = async () => {
    if (deleting) return;
    if (!window.confirm('Delete this task? All offers, messages, and payment records for it will be permanently removed. This cannot be undone.')) return;
    setDeleting(true);
    // Guard: money in escrow must be released or cancelled before deletion,
    // otherwise the lister's card hold and helper's payout would be orphaned.
    if (await listingHasHeldPayment(listing.id)) {
      notify.error('A payment is still held in escrow for this task. Release or cancel it from the task chat first.');
      setDeleting(false);
      return;
    }
    const ok = await deleteListing(listing.id);
    if (!ok) {
      notify.error("Couldn't delete the task. Please try again.");
      setDeleting(false);
      return;
    }
    notify.success('Task deleted.');
    navigate('/dashboard');
  };

  const handleAccept = (offerId: string) => {
    acceptOffer(offerId, listing.id);
    // Reveal the broadcast prompt after a brief moment
    setTimeout(() => setShowBroadcastPrompt(true), 400);
  };

  const handleSendBroadcast = (withNote: boolean) => {
    if (!listing) return;
    addBroadcast({
      areaLabel: listing.location.city,
      category: listing.category,
      message: generateBroadcastMessage(listing.category),
      note: withNote && broadcastNote.trim() ? broadcastNote.trim() : undefined,
      completedAt: new Date().toISOString(),
    });
    setBroadcastSent(true);
    setShowBroadcastPrompt(false);
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
      currentStepIndex: 0,
      stepsCompleted: false,
      requestedAmount: 0,
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
            <div className="space-y-2">
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
              {listing.imageUrls.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {listing.imageUrls.slice(1).map(url => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-xl overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
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
                {isOwner ? (
                  <button
                    onClick={handleDeleteTask}
                    disabled={deleting}
                    title="Delete this task"
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                ) : (
                  <button
                    onClick={() => setReportOpen(true)}
                    title="Report this task"
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Flag size={16} />
                  </button>
                )}
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
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <h3 className="font-bold text-emerald-800">
                  {listing.status === 'completed' ? 'Task complete!' : 'Helper Confirmed!'}
                </h3>
              </div>
              <OfferCard offer={acceptedOffer} isOwner={false} expanded />

              {/* Open Task Chat button — shown to both parties */}
              {(isOwner || acceptedOffer.offererId === currentUser.id) && (
                <div className="pt-2 border-t border-emerald-200">
                  <Link
                    to={`/chat/${acceptedOffer.id}`}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700
                      text-white font-bold py-2.5 rounded-xl transition-colors"
                  >
                    <MessageCircle size={16} /> Open Task Chat
                  </Link>
                  {listing.taskSteps.length > 0 && (
                    <p className="text-xs text-emerald-700 mt-1.5 text-center">
                      {listing.taskSteps.length}-step guide ready for your helper
                    </p>
                  )}
                </div>
              )}

              {/* Mark as complete — owner only, while in-progress */}
              {isOwner && listing.status === 'in-progress' && (
                <div className="pt-2 border-t border-emerald-200">
                  <button
                    onClick={() => {
                      completeOffer(acceptedOffer.id, listing.id);
                      setShowBroadcastPrompt(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700
                      text-white font-bold py-2.5 rounded-xl transition-colors"
                  >
                    <CheckCircle2 size={16} /> Mark task complete
                  </button>
                  <p className="text-xs text-emerald-700 mt-2 text-center">
                    Once you mark this complete, you'll be able to leave a review.
                  </p>
                </div>
              )}

              {/* Leave a review — both parties, only after completion, only if not yet rated */}
              {listing.status === 'completed' && (
                <div className="pt-2 border-t border-emerald-200 space-y-2">
                  {(() => {
                    const meIsOwner = isOwner;
                    const meIsHelper = acceptedOffer.offererId === currentUser.id;
                    const myRating = meIsOwner
                      ? acceptedOffer.ratingByRequester
                      : meIsHelper ? acceptedOffer.ratingByHelper : undefined;

                    if (!meIsOwner && !meIsHelper) return null;
                    if (myRating) {
                      return (
                        <div className="flex items-center justify-center gap-1.5 text-sm text-emerald-700 font-semibold">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          You rated this {myRating}/5. Thanks for the feedback!
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={() => setReviewOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600
                          text-white font-bold py-2.5 rounded-xl transition-colors"
                      >
                        <Star size={16} /> Leave a review
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Review modal */}
          {reviewOpen && acceptedOffer && (() => {
            const meIsOwner = isOwner;
            const meIsHelper = acceptedOffer.offererId === currentUser.id;
            if (!meIsOwner && !meIsHelper) { setReviewOpen(false); return null; }
            const subjectId = meIsOwner ? acceptedOffer.offererId : listing.requesterId;
            const subject = getUserById(subjectId);
            if (!subject) { setReviewOpen(false); return null; }
            return (
              <ReviewModal
                subject={subject}
                raterRole={meIsOwner ? 'requester' : 'helper'}
                onClose={() => setReviewOpen(false)}
                onSubmit={(rating, note) => rateOffer(acceptedOffer.id, meIsOwner ? 'requester' : 'helper', rating, note)}
              />
            );
          })()}

          {reportOpen && (
            <ReportModal
              targetType="listing"
              targetId={listing.id}
              onClose={() => setReportOpen(false)}
            />
          )}

          {/* ── COMMUNITY BROADCAST PROMPT ────────────────────────── */}
          {showBroadcastPrompt && !broadcastSent && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={18} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 mb-0.5">Let your neighbors know something good happened?</h3>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    We'll send a completely anonymous signal to people near you — no names, no task details,
                    just a quiet nudge that someone in the area came through for someone else.
                    It's optional, and it helps build a sense of safety in the community.
                  </p>
                </div>
              </div>

              {/* Optional note */}
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1.5">
                  Add a short anonymous note? <span className="font-normal text-amber-600">(completely optional)</span>
                </label>
                <textarea
                  value={broadcastNote}
                  onChange={e => setBroadcastNote(e.target.value)}
                  placeholder={`e.g. "Didn't expect a neighbor to show up so quickly. This app works."`}
                  maxLength={LIMITS.broadcastNote}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-amber-200 bg-white/70 rounded-xl resize-none
                    focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-amber-400"
                />
                <p className="text-[10px] text-amber-600 mt-1">
                  Your name and the task title will never be included. Max 160 characters.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleSendBroadcast(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600
                    text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  <Sparkles size={14} />
                  Yes — let the neighborhood know ✨
                </button>
                <button
                  onClick={() => handleSendBroadcast(false)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold
                    text-amber-700 bg-white border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors"
                >
                  Send without a note
                </button>
                <button
                  onClick={() => setShowBroadcastPrompt(false)}
                  className="px-4 py-2.5 text-sm text-amber-600 hover:text-amber-800 font-medium"
                >
                  Not this time
                </button>
              </div>
            </div>
          )}

          {broadcastSent && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
              <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Signal sent to your neighborhood ✨</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  An anonymous note has been added to the Community Pulse. No one knows it was you.
                </p>
              </div>
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
                      maxLength={LIMITS.offerMessage}
                      className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl resize-none
                        focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <div className="text-right text-xs text-slate-400 mt-1">
                      {offerMsg.length}/{LIMITS.offerMessage}
                    </div>
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

          {/* Neighborhood activity */}
          {listing.location.neighborhood && (
            <NeighborhoodActivity neighborhood={listing.location.neighborhood} />
          )}
        </div>
      </div>
    </div>
  );
};
