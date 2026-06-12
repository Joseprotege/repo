/**
 * ChatPage — the three-tier communication hub for an accepted offer.
 *
 * Tier 1 (Steps tab):   Lister's pre-authored step queue, helper responds sequentially
 * Tier 2 (Chat tab):    Free-form DM thread between both parties
 * Tier 3 (Voice btn):   WebRTC voice-call escalation as a last resort
 *
 * Also includes the Payment panel for agreeing on compensation and releasing escrow.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, MessageCircle, ListChecks, Phone, CheckCircle2,
  ChevronDown, ChevronUp, Send, Lock, CreditCard, Loader2,
  DollarSign, Info, AlertTriangle, CheckCheck, RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/common/Avatar';
import { VoiceCallModal } from '../components/chat/VoiceCallModal';
import { StripePaymentModal } from '../components/chat/StripePaymentModal';
import {
  fetchMessages, sendMessage, subscribeToMessages, advanceStep,
} from '../services/messages';
import {
  fetchPaymentRequest, createPaymentRequest, releasePayment, holdPayment,
  releasePaymentViaStripe, cancelPaymentViaStripe, cancelPayment,
  reactivatePayment, getActiveFeePercent, computeFeeBreakdown,
} from '../services/payments';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import { STRIPE_CONFIGURED } from '../lib/stripe';
import { FEE_TIERS } from '../types';
import type { TaskMessage, PaymentRequest, TaskStep } from '../types';
import { LIMITS } from '../lib/limits';

// ── Utilities ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Step Queue Panel ──────────────────────────────────────────────────────────

interface StepQueueProps {
  steps: TaskStep[];
  currentIndex: number;
  stepsCompleted: boolean;
  messages: TaskMessage[];
  isHelper: boolean;
  isRequester: boolean;
  onRespond: (response: string, stepIndex: number) => void;
  onApproveStep: (stepIndex: number) => void;
}

const StepQueuePanel: React.FC<StepQueueProps> = ({
  steps, currentIndex, stepsCompleted, messages, isHelper, isRequester,
  onRespond, onApproveStep,
}) => {
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
        <ListChecks size={36} className="text-slate-300 mb-3" />
        <p className="font-semibold text-slate-600 mb-1">No step guide</p>
        <p className="text-sm text-slate-400">
          The lister didn't add a step-by-step guide for this task.
          Use the Chat tab to coordinate directly.
        </p>
      </div>
    );
  }

  const getStepResponse = (idx: number) =>
    messages.find(m => m.type === 'step_response' && m.stepIndex === idx);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim() || submitting) return;
    setSubmitting(true);
    await onRespond(response.trim(), currentIndex);
    setResponse('');
    setSubmitting(false);
  };

  const handleApprove = async (idx: number) => {
    if (approving) return;
    setApproving(true);
    await onApproveStep(idx);
    setApproving(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {stepsCompleted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <CheckCheck size={16} className="text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-700">All steps completed! 🎉</p>
          </div>
        )}

        {steps.map((step, idx) => {
          const stepMsg = getStepResponse(idx);
          // A step is "done" (green) only after the lister approved it (index advanced past it)
          const isDone = idx < currentIndex || stepsCompleted;
          const isCurrent = idx === currentIndex && !stepsCompleted;
          const isLocked = idx > currentIndex && !stepsCompleted;
          // Lister sees "Approve" when helper has responded but step hasn't been approved yet
          const awaitingApproval = isCurrent && !!stepMsg && isRequester;

          return (
            <div
              key={step.id}
              className={`rounded-xl border p-4 transition-all
                ${isDone ? 'bg-emerald-50 border-emerald-200' : ''}
                ${isCurrent && !awaitingApproval ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-300' : ''}
                ${awaitingApproval ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300' : ''}
                ${isLocked ? 'bg-slate-50 border-slate-200 opacity-60' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Step number / status icon */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5
                  ${isDone ? 'bg-emerald-500 text-white' : ''}
                  ${awaitingApproval ? 'bg-amber-500 text-white' : ''}
                  ${isCurrent && !awaitingApproval ? 'bg-teal-600 text-white' : ''}
                  ${isLocked ? 'bg-slate-300 text-white' : ''}
                `}>
                  {isDone ? '✓' : awaitingApproval ? '!' : isLocked ? <Lock size={12} /> : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Instruction */}
                  <p className={`text-sm font-semibold leading-relaxed
                    ${isDone ? 'text-emerald-800' : awaitingApproval ? 'text-amber-900' : isCurrent ? 'text-teal-900' : 'text-slate-600'}
                  `}>
                    {step.instruction}
                  </p>

                  {/* Hint */}
                  {step.hint && (
                    <p className="text-xs text-amber-700 mt-1 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 inline-block">
                      💡 {step.hint}
                    </p>
                  )}

                  {/* Helper's response */}
                  {stepMsg && (
                    <div className="mt-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-emerald-600 font-semibold mb-0.5">
                        {isHelper ? 'Your response:' : 'Helper responded:'}
                      </p>
                      <p className="text-xs text-slate-700">{stepMsg.content}</p>
                    </div>
                  )}

                  {/* Lister: approve step to unlock next */}
                  {awaitingApproval && (
                    <button
                      onClick={() => handleApprove(idx)}
                      disabled={approving}
                      className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600
                        disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      {approving
                        ? <Loader2 size={12} className="animate-spin" />
                        : <CheckCircle2 size={12} />}
                      Looks good — unlock next step
                    </button>
                  )}

                  {/* Helper: waiting for lister to approve */}
                  {isCurrent && !!stepMsg && isHelper && (
                    <p className="mt-2 text-xs text-amber-700 font-medium">
                      ⏳ Waiting for the task owner to review and unlock the next step…
                    </p>
                  )}
                </div>
              </div>

              {/* Response input — current step, helper only, not yet responded */}
              {isCurrent && isHelper && !stepMsg && (
                <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    placeholder="Respond to unlock the next step…"
                    maxLength={LIMITS.stepResponse}
                    className="flex-1 px-3 py-2 text-sm border border-teal-300 rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !response.trim()}
                    className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg
                      disabled:opacity-50 transition-colors"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── DM Thread ─────────────────────────────────────────────────────────────────

interface DMThreadProps {
  messages: TaskMessage[];
  currentUserId: string;
  otherUser: { displayName: string; avatarUrl: string } | undefined;
  onSend: (text: string) => void;
}

const DMThread: React.FC<DMThreadProps> = ({ messages, currentUserId, otherUser, onSend }) => {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const dmMessages = messages.filter(m =>
    m.type === 'dm' || m.type === 'system' ||
    m.type === 'voice_request' || m.type === 'voice_accept' || m.type === 'voice_decline',
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const VOICE_LABELS: Partial<Record<string, string>> = {
    voice_request: '📞 Voice call requested',
    voice_accept:  '✅ Voice call accepted',
    voice_decline: '❌ Voice call declined',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {dmMessages.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle size={36} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No messages yet — say hello!</p>
          </div>
        )}

        {dmMessages.map(msg => {
          const isMe = msg.senderId === currentUserId;
          const isSystem = msg.type === 'system';
          const isVoiceEvent = msg.type === 'voice_request' || msg.type === 'voice_accept' || msg.type === 'voice_decline';

          if (isSystem || isVoiceEvent) {
            const label = isVoiceEvent
              ? VOICE_LABELS[msg.type]
              : msg.content;
            return (
              <div key={msg.id} className="text-center">
                <span className={`text-xs rounded-full px-3 py-1
                  ${isVoiceEvent
                    ? 'text-teal-700 bg-teal-50 border border-teal-200'
                    : 'text-slate-400 bg-slate-100'}`}>
                  {label}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isMe && otherUser && (
                <img
                  src={otherUser.avatarUrl}
                  alt={otherUser.displayName}
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
                />
              )}
              <div className={`max-w-[75%]`}>
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed
                    ${isMe
                      ? 'bg-teal-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }
                  `}
                >
                  {msg.content}
                </div>
                <p className={`text-[10px] text-slate-400 mt-0.5 ${isMe ? 'text-right' : 'text-left'}`}>
                  {timeAgo(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="border-t border-slate-200 p-3">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message…"
            maxLength={LIMITS.chatMessage}
            className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl
              disabled:opacity-50 transition-colors"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Payment Panel ─────────────────────────────────────────────────────────────

interface PaymentPanelProps {
  offerId: string;
  listingId: string;
  requesterId: string;
  helperId: string;
  requestedAmountCents: number;
  isRequester: boolean;
  taskCompleted: boolean;
  listingTitle: string;
  helperName: string;
}

const PaymentPanel: React.FC<PaymentPanelProps> = ({
  offerId,
  listingId,
  requesterId,
  helperId,
  requestedAmountCents,
  isRequester,
  taskCompleted,
  listingTitle,
  helperName,
}) => {
  const [payReq, setPayReq] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [feePct, setFeePct] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Key used to persist "payment was authorized but webhook hasn't fired yet"
  // across page navigation within the same browser tab session.
  const authorizedKey = `foster_pay_authorized_${offerId}`;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [req, pct] = await Promise.all([
        fetchPaymentRequest(offerId),
        getActiveFeePercent(),
      ]);
      if (!mounted) return;
      // If we locally know the payment was authorized (Stripe returned
      // requires_capture) but the webhook hasn't updated the DB yet, show
      // "held" so the user doesn't see the card form re-appear on re-mount.
      const locallyAuthorized = sessionStorage.getItem(authorizedKey) === '1';
      if (req && req.status === 'pending' && locallyAuthorized) {
        setPayReq({ ...req, status: 'held' });
      } else {
        setPayReq(req);
        if (req && req.status === 'held') {
          // Webhook fired — no longer need the local flag
          sessionStorage.removeItem(authorizedKey);
        }
      }
      setFeePct(pct ?? 0);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [offerId]);

  const { platformFeeCents, helperPayoutCents } = computeFeeBreakdown(
    payReq?.amountCents ?? requestedAmountCents,
    payReq?.platformFeePct ?? feePct,
  );

  const createRequest = async () => {
    setActionLoading(true);
    const req = await createPaymentRequest({
      offerId, listingId, requesterId, helperId,
      amountCents: requestedAmountCents,
      feePct,
    });
    if (req) setPayReq(req);
    setActionLoading(false);
  };

  // "Fund Escrow" — show confirmation first, then open Stripe modal.
  // Falls back to direct DB update (mock mode) when STRIPE_CONFIGURED is false.
  const handleHold = async () => {
    if (!payReq) return;
    if (STRIPE_CONFIGURED) {
      setShowConfirmation(true);
      return;
    }
    setActionLoading(true);
    await holdPayment(payReq.id);
    setPayReq(p => p ? { ...p, status: 'held' } : p);
    setActionLoading(false);
  };

  // Called by the Stripe modal once funds are authorized
  const handleStripeAuthorized = () => {
    setStripeModalOpen(false);
    // Persist across re-mounts so navigating away/back doesn't show the card
    // form again while we wait for the webhook to flip the DB row.
    sessionStorage.setItem(authorizedKey, '1');
    setPayReq(p => p ? { ...p, status: 'held' } : p);
    // Re-fetch to sync with DB, but never downgrade held → pending
    setTimeout(() => {
      fetchPaymentRequest(offerId).then(req => {
        if (!req) return;
        setPayReq(prev => {
          if (prev?.status === 'held' && req.status === 'pending') return prev;
          return req;
        });
        if (req.status === 'held') sessionStorage.removeItem(authorizedKey);
      });
    }, 3000);
  };

  // "Cancel" — voids the uncaptured Stripe authorization (releasing the hold
  // on the lister's card) and marks the payment_request cancelled.
  const handleCancelPayment = async () => {
    if (!payReq) return;
    if (!window.confirm('Cancel this payment? Any card hold will be voided and the helper will not be paid.')) return;
    setActionLoading(true);
    setReleaseError(null);
    if (STRIPE_CONFIGURED) {
      const { ok, error } = await cancelPaymentViaStripe(payReq.id);
      if (ok) {
        sessionStorage.removeItem(authorizedKey);
        setPayReq(p => p ? { ...p, status: 'cancelled' } : p);
      } else {
        setReleaseError(error ?? 'Could not cancel the payment. Please try again.');
      }
    } else {
      await cancelPayment(payReq.id);
      setPayReq(p => p ? { ...p, status: 'cancelled' } : p);
    }
    setActionLoading(false);
  };

  // "Restart" — re-opens a cancelled payment. The PI fields were cleared on
  // cancel, so funding again creates a fresh PaymentIntent.
  const handleReactivate = async () => {
    if (!payReq) return;
    setActionLoading(true);
    setReleaseError(null);
    const ok = await reactivatePayment(payReq.id);
    if (ok) {
      setPayReq(p => p ? { ...p, status: 'pending' } : p);
    } else {
      setReleaseError('Could not restart the payment. Please try again.');
    }
    setActionLoading(false);
  };

  // "Release" — captures the held PaymentIntent via the Edge Function when
  // Stripe is configured; falls back to direct DB update otherwise.
  const handleRelease = async () => {
    if (!payReq) return;
    setActionLoading(true);
    setReleaseError(null);
    if (STRIPE_CONFIGURED) {
      const { ok, error } = await releasePaymentViaStripe(payReq.id);
      if (ok) {
        setPayReq(p => p ? { ...p, status: 'released' } : p);
      } else {
        setReleaseError(error ?? 'Could not release the payment. Please try again.');
      }
    } else {
      await releasePayment(payReq.id);
      setPayReq(p => p ? { ...p, status: 'released' } : p);
    }
    setActionLoading(false);
  };

  // Volunteer task — no payment needed
  if (requestedAmountCents === 0 && !payReq) {
    return (
      <div className="border-t border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CheckCircle2 size={15} className="text-emerald-500" />
          This is a volunteer task — no payment involved.
        </div>
      </div>
    );
  }

  const activeTier = FEE_TIERS.find(t => t.feePct === feePct) ?? FEE_TIERS[0];

  return (
    <div className="border-t border-slate-200">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-teal-600" />
          <span className="text-sm font-semibold text-slate-700">Payment</span>
          {payReq && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full
              ${payReq.status === 'released' ? 'bg-emerald-100 text-emerald-700' : ''}
              ${payReq.status === 'held' ? 'bg-blue-100 text-blue-700' : ''}
              ${payReq.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
              ${payReq.status === 'cancelled' || payReq.status === 'refunded' ? 'bg-slate-100 text-slate-600' : ''}
            `}>
              {payReq.status}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 overflow-y-auto max-h-[55dvh]">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              {/* Fee breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested amount</span>
                  <span className="font-semibold">
                    {centsToDisplay(payReq?.amountCents ?? requestedAmountCents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    Platform fee
                    <span className="text-xs bg-slate-200 text-slate-600 rounded px-1">
                      {activeTier.label} — {feePct}%
                    </span>
                  </span>
                  <span className="font-semibold text-slate-600">−{centsToDisplay(platformFeeCents)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                  <span className="text-teal-700">Helper receives</span>
                  <span className="text-teal-700">{centsToDisplay(helperPayoutCents)}</span>
                </div>
              </div>

              {/* Fee tier info */}
              <div className="text-xs text-slate-500 flex items-start gap-1.5">
                <Info size={12} className="flex-shrink-0 mt-0.5 text-slate-400" />
                Foster's fee scales from 0% (early community) up to 15% (platform scale).
                Current tier: <strong>{activeTier.label} ({feePct}%)</strong>
              </div>

              {/* Status + actions */}
              {!payReq && isRequester && (
                <button
                  onClick={createRequest}
                  disabled={actionLoading || requestedAmountCents === 0}
                  className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700
                    disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                  Agree to payment terms
                </button>
              )}

              {payReq?.status === 'pending' && isRequester && !showConfirmation && (
                <div className="space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800 flex items-start gap-1.5">
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                    {taskCompleted
                      ? 'Task is complete but payment hasn\'t been funded yet. Authorize now to pay the helper for their work.'
                      : 'Payment terms agreed. Fund escrow to protect both parties — your money is only released to the helper after you confirm the task is complete.'}
                  </div>
                  <button
                    onClick={handleHold}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700
                      disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    Fund Escrow via Stripe
                  </button>
                  {!STRIPE_CONFIGURED && (
                    <p className="text-xs text-slate-400 text-center">
                      Stripe is not configured — clicking will mock the hold for testing
                    </p>
                  )}
                  <button
                    onClick={handleCancelPayment}
                    disabled={actionLoading}
                    className="w-full text-xs font-semibold text-slate-400 hover:text-red-500 py-1.5 transition-colors"
                  >
                    Cancel payment request
                  </button>
                  {releaseError && (
                    <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                      {releaseError}
                    </div>
                  )}
                </div>
              )}

              {payReq?.status === 'pending' && isRequester && showConfirmation && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="font-bold text-slate-800 text-sm mb-0.5">Confirm payment</p>
                    <p className="text-xs text-slate-500">Review the details before your card is charged</p>
                  </div>
                  <div className="bg-white border border-blue-100 rounded-lg p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 shrink-0">Task</span>
                      <span className="font-semibold text-slate-700 text-right truncate">{listingTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Helper</span>
                      <span className="font-semibold text-slate-700">{helperName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">You authorize</span>
                      <span className="font-semibold text-slate-700">{centsToDisplay(payReq.amountCents)}</span>
                    </div>
                    <div className="flex justify-between text-teal-700 border-t border-slate-100 pt-1.5">
                      <span className="font-semibold">Helper receives</span>
                      <span className="font-bold">{centsToDisplay(helperPayoutCents)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Funds are authorized now but only released to {helperName} when you mark this task complete.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirmation(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { setShowConfirmation(false); setStripeModalOpen(true); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700
                        text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                    >
                      <Lock size={14} />
                      Confirm & Pay
                    </button>
                  </div>
                </div>
              )}

              {payReq?.status === 'held' && isRequester && taskCompleted && (
                <div className="space-y-2">
                  <button
                    onClick={handleRelease}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700
                      disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Release Payment to Helper
                  </button>
                  <button
                    onClick={handleCancelPayment}
                    disabled={actionLoading}
                    className="w-full text-xs font-semibold text-slate-400 hover:text-red-500 py-1.5 transition-colors"
                  >
                    Cancel payment & void card hold
                  </button>
                  {releaseError && (
                    <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                      {releaseError}
                    </div>
                  )}
                </div>
              )}

              {payReq?.status === 'held' && isRequester && !taskCompleted && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 text-center bg-slate-50 border border-slate-200 rounded-xl py-2">
                    Funds held in escrow. Mark the task complete to release payment.
                  </div>
                  <button
                    onClick={handleCancelPayment}
                    disabled={actionLoading}
                    className="w-full text-xs font-semibold text-slate-400 hover:text-red-500 py-1.5 transition-colors"
                  >
                    Cancel payment & void card hold
                  </button>
                  {releaseError && (
                    <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                      {releaseError}
                    </div>
                  )}
                </div>
              )}

              {payReq?.status === 'cancelled' && isRequester && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 text-center bg-slate-50 border border-slate-200 rounded-xl py-2">
                    Payment cancelled. Any card hold has been voided.
                  </div>
                  <button
                    onClick={handleReactivate}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700
                      disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                    Restart payment
                  </button>
                  {releaseError && (
                    <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                      {releaseError}
                    </div>
                  )}
                </div>
              )}

              {payReq?.status === 'released' && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold justify-center bg-emerald-50 border border-emerald-200 rounded-xl py-2">
                  <CheckCircle2 size={15} />
                  Payment released to helper ✓
                </div>
              )}

              {!isRequester && (
                <div className="text-xs text-slate-500 text-center">
                  {payReq?.status === 'held' && '💰 Your payment is held securely. The lister will release it when the task is verified.'}
                  {payReq?.status === 'released' && `🎉 ${centsToDisplay(payReq.helperPayoutCents)} has been sent to your account.`}
                  {payReq?.status === 'cancelled' && 'The lister cancelled this payment. They can restart it from their side at any time.'}
                  {(!payReq || payReq.status === 'pending') && 'Waiting for the lister to confirm payment terms.'}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Stripe payment modal — opens when lister clicks Fund Escrow */}
      {stripeModalOpen && payReq && (
        <StripePaymentModal
          paymentRequestId={payReq.id}
          amountCents={payReq.amountCents}
          platformFeeCents={payReq.platformFeeCents}
          helperPayoutCents={payReq.helperPayoutCents}
          onClose={() => setStripeModalOpen(false)}
          onAuthorized={handleStripeAuthorized}
        />
      )}
    </div>
  );
};

// ── Main ChatPage ─────────────────────────────────────────────────────────────

type Tab = 'steps' | 'chat';

export const ChatPage: React.FC = () => {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: authUser } = useAuth();
  const { getListingById, getUserById, offers, currentUser, completeOffer } = useApp();

  const offer = offers.find(o => o.id === offerId);
  const listing = offer ? getListingById(offer.listingId) : undefined;
  const requester = listing ? getUserById(listing.requesterId) : undefined;
  const helper = offer ? getUserById(offer.offererId) : undefined;

  const isHelper = !!authUser && authUser.id === offer?.offererId;
  const isRequester = !!authUser && authUser.id === listing?.requesterId;
  const otherUser = isHelper ? requester : helper;

  const [tab, setTab] = useState<Tab>('steps');
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(offer?.currentStepIndex ?? 0);
  const [stepsCompleted, setStepsCompleted] = useState(offer?.stepsCompleted ?? false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceRole, setVoiceRole] = useState<'initiator' | 'receiver'>('initiator');
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Load messages ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!offerId) return;
    let mounted = true;

    fetchMessages(offerId).then(msgs => {
      if (!mounted) return;
      setMessages(msgs);
      setMsgsLoading(false);
    });

    const sub = subscribeToMessages(offerId, msg => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => { mounted = false; sub.unsubscribe(); };
  }, [offerId]);

  // ── Sync step progress from offer ─────────────────────────────────────────

  useEffect(() => {
    if (offer) {
      setStepIndex(offer.currentStepIndex);
      setStepsCompleted(offer.stepsCompleted);
    }
  }, [offer?.currentStepIndex, offer?.stepsCompleted]);

  // ── Send DM ───────────────────────────────────────────────────────────────

  const handleSendDM = useCallback(async (text: string) => {
    if (!offerId || !listing || !authUser) return;

    // Optimistic
    const optimistic: TaskMessage = {
      id: `tmp_${Date.now()}`,
      listingId: listing.id,
      offerId,
      senderId: authUser.id,
      type: 'dm',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    if (SUPABASE_CONFIGURED) {
      const saved = await sendMessage({
        listingId: listing.id,
        offerId,
        senderId: authUser.id,
        type: 'dm',
        content: text,
      });
      if (saved) {
        setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
      }
    }
  }, [offerId, listing, authUser]);

  // ── Submit step response (helper) ─────────────────────────────────────────
  // The helper sends their response, but the step does NOT advance until the
  // lister approves it. Only a task_message is stored here; advanceStep is
  // called from handleApproveStep below.

  const handleStepRespond = useCallback(async (response: string, idx: number) => {
    if (!offerId || !listing || !authUser || !offer) return;

    const optimistic: TaskMessage = {
      id: `tmp_step_${Date.now()}`,
      listingId: listing.id,
      offerId,
      senderId: authUser.id,
      type: 'step_response',
      content: response,
      stepIndex: idx,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    if (SUPABASE_CONFIGURED) {
      const saved = await sendMessage({
        listingId: listing.id,
        offerId,
        senderId: authUser.id,
        type: 'step_response',
        content: response,
        stepIndex: idx,
      });
      if (saved) setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
    }
  }, [offerId, listing, authUser, offer]);

  // ── Approve step (lister) — advances the helper to the next step ───────────

  const handleApproveStep = useCallback(async (idx: number) => {
    if (!offerId || !listing || !authUser) return;

    const nextIndex = idx + 1;
    const totalSteps = listing.taskSteps.length;
    const done = nextIndex >= totalSteps;

    // Optimistic update
    setStepIndex(nextIndex);
    setStepsCompleted(done);

    if (SUPABASE_CONFIGURED) {
      // Persist approval as a message (triggers notification to helper)
      // and advance the offer's step index.
      await Promise.all([
        sendMessage({
          listingId: listing.id,
          offerId,
          senderId: authUser.id,
          type: 'step_approved',
          content: `Step ${idx + 1} approved`,
          stepIndex: idx,
        }),
        advanceStep(offerId, nextIndex, totalSteps),
      ]);
    }
  }, [offerId, listing, authUser]);

  // ── Voice call ────────────────────────────────────────────────────────────

  const openVoiceCall = useCallback(async (role: 'initiator' | 'receiver') => {
    setVoiceRole(role);
    setVoiceOpen(true);

    // When the HELPER initiates, persist a voice_request message so the lister
    // gets notified by GlobalVoiceListener even when off the chat page.
    if (role === 'initiator' && offerId && listing && authUser) {
      const optimistic: TaskMessage = {
        id: `tmp_voice_${Date.now()}`,
        listingId: listing.id,
        offerId,
        senderId: authUser.id,
        type: 'voice_request',
        content: 'Voice call requested',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimistic]);

      if (SUPABASE_CONFIGURED) {
        const saved = await sendMessage({
          listingId: listing.id,
          offerId,
          senderId: authUser.id,
          type: 'voice_request',
          content: 'Voice call requested',
        });
        if (saved) {
          setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
        }
      }
    }
  }, [offerId, listing, authUser]);

  // ── Auto-open receiver modal when navigated from incoming call banner ──────

  useEffect(() => {
    if (searchParams.get('incoming') === '1' && isRequester && !voiceOpen && offer) {
      setVoiceRole('receiver');
      setVoiceOpen(true);
      // Clear the param so a page refresh doesn't re-open the modal
      navigate(`/chat/${offerId}`, { replace: true });
    }
  // Only run when the params / offer / isRequester are first resolved
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('incoming'), isRequester, !!offer]);

  // ── Guard: not found ───────────────────────────────────────────────────────

  if (!offer || !listing) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Task chat not found</h2>
        <p className="text-slate-500 text-sm mb-6">
          Either this offer doesn't exist or you don't have access to it.
        </p>
        <Link to="/dashboard" className="text-teal-600 font-semibold">← Back to Dashboard</Link>
      </div>
    );
  }

  if (offer.status === 'pending' || offer.status === 'declined') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Chat unlocks when offer is accepted</h2>
        <p className="text-slate-500 text-sm mb-6">
          The lister needs to accept your offer before the task chat opens.
        </p>
        <Link to={`/listing/${listing.id}`} className="text-teal-600 font-semibold">← Back to Listing</Link>
      </div>
    );
  }

  const hasSteps = listing.taskSteps.length > 0;
  const taskDone = listing.status === 'completed';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-6 page-enter">
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-3 sm:mb-5 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to listing
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col
           h-[calc(100dvh-9rem)] sm:h-[calc(100dvh-11rem)] md:h-[calc(100dvh-13rem)]">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {otherUser && (
              <Avatar user={otherUser as Parameters<typeof Avatar>[0]['user']} size="md" showOnline />
            )}
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{listing.title}</p>
              <p className="text-xs text-slate-500">
                with {otherUser?.displayName ?? '…'} ·{' '}
                <span className={`font-semibold
                  ${taskDone ? 'text-emerald-600' : 'text-teal-600'}`}>
                  {taskDone ? 'Completed' : 'In progress'}
                </span>
              </p>
            </div>
          </div>

          {/* Voice call button — helper's privilege (last resort) */}
          {isHelper && (offer.status === 'accepted' || offer.status === 'completed') && (
            <button
              onClick={() => void openVoiceCall('initiator')}
              title="Request voice call (emergency escalation)"
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl
                text-slate-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50
                text-xs font-semibold transition-colors flex-shrink-0"
            >
              <Phone size={13} />
              <span className="hidden sm:inline">Call</span>
            </button>
          )}
          {isRequester && !voiceOpen && (
            <button
              onClick={() => void openVoiceCall('receiver')}
              title="Ready to receive a voice call"
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl
                text-slate-600 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50
                text-xs font-semibold transition-colors flex-shrink-0"
            >
              <Phone size={13} />
              <span className="hidden sm:inline">Receive call</span>
            </button>
          )}
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setTab('steps')}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-colors
              ${tab === 'steps'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <ListChecks size={15} />
            Steps
            {hasSteps && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ml-0.5
                ${stepsCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-700'}`}>
                {stepsCompleted ? '✓' : `${stepIndex}/${listing.taskSteps.length}`}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('chat')}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-colors
              ${tab === 'chat'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <MessageCircle size={15} />
            Chat
            {messages.filter(m => m.type === 'dm').length > 0 && (
              <span className="text-xs rounded-full px-1.5 py-0.5 font-bold bg-slate-100 text-slate-600 ml-0.5">
                {messages.filter(m => m.type === 'dm').length}
              </span>
            )}
          </button>
        </div>

        {/* ── Content ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden">
          {msgsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-slate-300" />
            </div>
          ) : (
            <>
              {tab === 'steps' && (
                <StepQueuePanel
                  steps={listing.taskSteps}
                  isRequester={isRequester}
                  onApproveStep={handleApproveStep}
                  currentIndex={stepIndex}
                  stepsCompleted={stepsCompleted}
                  messages={messages}
                  isHelper={isHelper}
                  onRespond={handleStepRespond}
                />
              )}
              {tab === 'chat' && (
                <DMThread
                  messages={messages}
                  currentUserId={authUser?.id ?? currentUser.id}
                  otherUser={otherUser as { displayName: string; avatarUrl: string } | undefined}
                  onSend={handleSendDM}
                />
              )}
            </>
          )}
        </div>

        {/* ── Payment panel ───────────────────────────────────────────── */}
        {(listing.isPaid || offer.requestedAmount > 0 || isRequester) && (
          <PaymentPanel
            offerId={offerId!}
            listingId={listing.id}
            requesterId={listing.requesterId}
            helperId={offer.offererId}
            requestedAmountCents={listing.budgetCents || offer.requestedAmount}
            isRequester={isRequester}
            taskCompleted={taskDone}
            listingTitle={listing.title}
            helperName={helper?.displayName ?? 'the helper'}
          />
        )}

        {/* ── Lister: mark complete ───────────────────────────────────── */}
        {isRequester && listing.status === 'in-progress' && (
          <div className="border-t border-slate-200 px-4 py-3">
            <button
              onClick={() => {
                completeOffer(offer.id, listing.id);
                setStepsCompleted(true);
              }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700
                text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              <CheckCircle2 size={15} />
              Mark task complete
            </button>
          </div>
        )}
      </div>

      {/* Voice call modal */}
      {voiceOpen && otherUser && (
        <VoiceCallModal
          offerId={offerId!}
          currentUserId={authUser?.id ?? currentUser.id}
          otherUser={otherUser as Parameters<typeof VoiceCallModal>[0]['otherUser']}
          role={voiceRole}
          initialStatus={voiceRole === 'initiator' ? 'idle' : 'receiving'}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </div>
  );
};
