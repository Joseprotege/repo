/**
 * GlobalVoiceListener — app-level component mounted in App.tsx.
 *
 * Listens for incoming voice_request messages across ALL of the current
 * user's accepted offer chats via Supabase Realtime. When one arrives:
 *  • Shows an in-app floating banner (bottom of screen) with Accept/Decline
 *  • Fires a browser Notification if permission is granted (works even
 *    when the tab is not focused)
 *
 * The receiver's "Answer" action navigates to /chat/:offerId?incoming=1,
 * which ChatPage detects and auto-opens VoiceCallModal in receiver mode.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { subscribeToVoiceRequests } from '../../services/messages';
import type { TaskMessage } from '../../types';

export const GlobalVoiceListener: React.FC = () => {
  const { user: authUser } = useAuth();
  const { getUserById, offers, getListingById } = useApp();
  const navigate = useNavigate();

  const [incomingCall, setIncomingCall] = useState<TaskMessage | null>(null);
  const [callerName, setCallerName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');

  // ── Request notification permission once on mount ──────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Handle incoming voice_request from Realtime ───────────────────────────
  const handleVoiceRequest = useCallback((msg: TaskMessage) => {
    // Ignore messages we sent ourselves
    if (!authUser || msg.senderId === authUser.id) return;

    const caller = msg.senderId ? getUserById(msg.senderId) : undefined;
    const name = caller?.displayName ?? 'Someone';
    const offer = offers.find(o => o.id === msg.offerId);
    const listing = offer ? getListingById(offer.listingId) : undefined;
    const title = listing?.title ?? 'a task';

    setCallerName(name);
    setTaskTitle(title);
    setIncomingCall(msg);

    // Browser notification — reaches even unfocused tabs
    if (typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted') {
      try {
        const notif = new Notification(`📞 Incoming call from ${name}`, {
          body: `Task: ${title}`,
          icon: '/favicon.ico',
          tag: `voice-${msg.offerId}`,   // dedup: replaces if re-sent
          requireInteraction: true,       // keeps visible until user acts
        });
        notif.onclick = () => {
          window.focus();
          navigate(`/chat/${msg.offerId}?incoming=1`);
          setIncomingCall(null);
          notif.close();
        };
      } catch {
        // Notifications blocked by browser policy — in-app banner is enough
      }
    }
  }, [authUser, getUserById, offers, getListingById, navigate]);

  // ── Subscribe / unsubscribe ───────────────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    const sub = subscribeToVoiceRequests(handleVoiceRequest);
    return () => sub.unsubscribe();
  }, [authUser, handleVoiceRequest]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const answerCall = () => {
    if (!incomingCall) return;
    navigate(`/chat/${incomingCall.offerId}?incoming=1`);
    setIncomingCall(null);
  };

  const dismissCall = () => setIncomingCall(null);

  if (!incomingCall) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4 pointer-events-none">
      <div
        className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden text-white pointer-events-auto
          ring-1 ring-white/10"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
            <Phone size={16} className="text-teal-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">📞 Incoming voice call</p>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {callerName} · {taskTitle}
            </p>
          </div>
          <button
            onClick={dismissCall}
            aria-label="Dismiss"
            className="text-slate-500 hover:text-slate-300 p-1 flex-shrink-0 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 py-3">
          <button
            onClick={dismissCall}
            className="flex-1 flex items-center justify-center gap-2 py-2.5
              bg-red-500/20 hover:bg-red-500/30 text-red-300
              rounded-xl text-sm font-semibold transition-colors"
          >
            <PhoneOff size={14} />
            Decline
          </button>
          <button
            onClick={answerCall}
            className="flex-1 flex items-center justify-center gap-2 py-2.5
              bg-teal-600 hover:bg-teal-700 text-white
              rounded-xl text-sm font-semibold transition-colors"
          >
            <Phone size={14} />
            Answer
          </button>
        </div>
      </div>
    </div>
  );
};
