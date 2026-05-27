/**
 * VoiceCallModal — WebRTC in-browser voice call between lister and helper.
 *
 * Signaling uses Supabase Realtime broadcast (ephemeral, no DB storage).
 * ICE server: public Google STUN (no credentials needed).
 *
 * State machine:
 *   idle → requesting → (accepted → connecting → active) | declined
 *   active → ended
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, PhoneOff, PhoneMissed, Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getVoiceChannel } from '../../services/messages';
import type { VoiceSignal } from '../../services/messages';
import type { User } from '../../types';

export type CallStatus =
  | 'idle'
  | 'requesting'     // helper initiated, waiting for lister to respond
  | 'receiving'      // lister is seeing the incoming call screen
  | 'connecting'     // offer/answer exchanged, waiting for ICE
  | 'active'
  | 'declined'
  | 'ended'
  | 'error';

interface VoiceCallModalProps {
  offerId: string;
  currentUserId: string;
  otherUser: User;
  /** 'initiator' = the helper who requested the call; 'receiver' = the lister */
  role: 'initiator' | 'receiver';
  initialStatus: CallStatus;
  onClose: () => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  offerId,
  currentUserId,
  otherUser,
  role,
  initialStatus,
  onClose,
}) => {
  const [status, setStatus] = useState<CallStatus>(initialStatus);
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const sendSignal = useCallback((signal: VoiceSignal) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: signal,
    });
  }, []);

  const cleanup = useCallback((nextStatus: CallStatus) => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    channelRef.current?.unsubscribe();
    pcRef.current = null;
    localStreamRef.current = null;
    channelRef.current = null;
    setStatus(nextStatus);
  }, []);

  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  }, []);

  // ── WebRTC setup ──────────────────────────────────────────────────────────

  const buildPeerConnection = useCallback(async () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Get mic access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
    } catch {
      cleanup('error');
      return null;
    }

    // Remote audio
    pc.ontrack = e => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = e.streams[0];
    };

    // ICE candidates
    pc.onicecandidate = e => {
      if (e.candidate) {
        sendSignal({ type: 'ice', candidate: e.candidate.toJSON(), from: currentUserId });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus('active');
        startTimer();
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        cleanup('ended');
      }
    };

    return pc;
  }, [cleanup, currentUserId, sendSignal, startTimer]);

  // ── Initiator flow (helper creates offer SDP) ─────────────────────────────

  const initiateCall = useCallback(async () => {
    const pc = await buildPeerConnection();
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal({ type: 'offer', sdp: offer.sdp!, from: currentUserId });
    setStatus('requesting');
  }, [buildPeerConnection, currentUserId, sendSignal]);

  // ── Receiver flow (lister creates answer SDP) ─────────────────────────────

  const acceptCall = useCallback(async (offerSdp: string) => {
    const pc = await buildPeerConnection();
    if (!pc) return;
    await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal({ type: 'answer', sdp: answer.sdp!, from: currentUserId });
    setStatus('connecting');
  }, [buildPeerConnection, currentUserId, sendSignal]);

  // ── Signal handler ────────────────────────────────────────────────────────

  const handleSignal = useCallback(async (signal: VoiceSignal) => {
    if (signal.from === currentUserId) return; // ignore own signals

    if (signal.type === 'offer' && role === 'receiver') {
      setStatus('receiving');
      // Store sdp to use when receiver taps "Accept"
      (channelRef.current as unknown as { _pendingOfferSdp?: string })._pendingOfferSdp = signal.sdp;
    }

    if (signal.type === 'answer' && role === 'initiator' && pcRef.current) {
      await pcRef.current.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
      setStatus('connecting');
    }

    if (signal.type === 'ice' && pcRef.current) {
      await pcRef.current.addIceCandidate(signal.candidate).catch(() => {});
    }

    if (signal.type === 'hangup') {
      cleanup('ended');
    }
  }, [cleanup, currentUserId, role]);

  // ── Subscribe to signaling channel on mount ────────────────────────────────

  useEffect(() => {
    const ch = getVoiceChannel(offerId);
    if (!ch) { setStatus('error'); return; }
    channelRef.current = ch;

    ch.on('broadcast', { event: 'signal' }, ({ payload }) => {
      handleSignal(payload as VoiceSignal);
    }).subscribe(async state => {
      if (state === 'SUBSCRIBED' && role === 'initiator') {
        await initiateCall();
      }
    });

    return () => {
      cleanup('ended');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mute controls ─────────────────────────────────────────────────────────

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !speakerOff;
    }
    setSpeakerOff(s => !s);
  };

  const hangUp = () => {
    sendSignal({ type: 'hangup', from: currentUserId });
    cleanup('ended');
  };

  const declineCall = () => {
    sendSignal({ type: 'hangup', from: currentUserId });
    cleanup('declined');
  };

  const acceptIncoming = async () => {
    const pending = (channelRef.current as unknown as { _pendingOfferSdp?: string })._pendingOfferSdp;
    if (pending) await acceptCall(pending);
  };

  // ── Format elapsed time ───────────────────────────────────────────────────

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl shadow-2xl text-white overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 ring-4 ring-white/20">
            <img src={otherUser.avatarUrl} alt={otherUser.displayName} className="w-full h-full object-cover" />
          </div>
          <p className="font-black text-xl">{otherUser.displayName}</p>
          <p className="text-slate-400 text-sm mt-0.5">
            {status === 'requesting' && 'Calling…'}
            {status === 'receiving' && 'Incoming call'}
            {status === 'connecting' && 'Connecting…'}
            {status === 'active' && fmt(elapsed)}
            {status === 'declined' && 'Call declined'}
            {status === 'ended' && 'Call ended'}
            {status === 'error' && 'Could not start call'}
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex justify-center mb-6">
          {(status === 'requesting' || status === 'connecting') && (
            <Loader2 size={20} className="text-teal-400 animate-spin" />
          )}
          {status === 'active' && (
            <div className="flex gap-1">
              {[0.3, 0.6, 1, 0.6, 0.3].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-teal-400 rounded-full animate-pulse"
                  style={{ height: `${h * 24}px`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          )}
          {status === 'declined' && <PhoneMissed size={24} className="text-red-400" />}
          {status === 'ended' && <PhoneOff size={24} className="text-slate-400" />}
          {status === 'error' && <PhoneMissed size={24} className="text-red-400" />}
        </div>

        {/* Controls */}
        <div className="px-6 pb-8">
          {/* Incoming call */}
          {status === 'receiving' && (
            <div className="flex justify-center gap-8">
              <button
                onClick={declineCall}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
                  <PhoneOff size={24} />
                </div>
                <span className="text-xs text-slate-400">Decline</span>
              </button>
              <button
                onClick={acceptIncoming}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-teal-500 hover:bg-teal-600 flex items-center justify-center transition-colors animate-pulse">
                  <Phone size={24} />
                </div>
                <span className="text-xs text-slate-400">Accept</span>
              </button>
            </div>
          )}

          {/* Active call controls */}
          {status === 'active' && (
            <div className="flex justify-center gap-4">
              <button
                onClick={toggleMute}
                className={`flex flex-col items-center gap-2`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
                  ${muted ? 'bg-red-500/80' : 'bg-white/10 hover:bg-white/20'}`}>
                  {muted ? <MicOff size={20} /> : <Mic size={20} />}
                </div>
                <span className="text-xs text-slate-400">{muted ? 'Unmute' : 'Mute'}</span>
              </button>

              <button
                onClick={hangUp}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
                  <PhoneOff size={24} />
                </div>
                <span className="text-xs text-slate-400">End</span>
              </button>

              <button
                onClick={toggleSpeaker}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
                  ${speakerOff ? 'bg-red-500/80' : 'bg-white/10 hover:bg-white/20'}`}>
                  {speakerOff ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </div>
                <span className="text-xs text-slate-400">{speakerOff ? 'Unmute spkr' : 'Speaker'}</span>
              </button>
            </div>
          )}

          {/* Terminal states */}
          {(status === 'declined' || status === 'ended' || status === 'error') && (
            <button
              onClick={onClose}
              className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-sm transition-colors"
            >
              Close
            </button>
          )}

          {/* Requesting — can cancel */}
          {status === 'requesting' && (
            <button
              onClick={() => { sendSignal({ type: 'hangup', from: currentUserId }); cleanup('ended'); }}
              className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancel Call
            </button>
          )}
        </div>

        {/* Privacy note */}
        {(status === 'requesting' || status === 'receiving') && (
          <p className="text-center text-xs text-slate-500 pb-4 px-6">
            Voice calls use end-to-end encryption via WebRTC.
            Your phone number is never shared.
          </p>
        )}
      </div>
    </div>
  );
};
