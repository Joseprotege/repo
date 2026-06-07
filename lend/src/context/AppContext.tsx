import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { User, Listing, Offer, Notification, CommunityBroadcast } from '../types';
import {
  MOCK_USERS, MOCK_LISTINGS, MOCK_OFFERS, MOCK_NOTIFICATIONS, MOCK_BROADCASTS,
} from '../data/mockData';
import { useAuth } from './AuthContext';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import {
  adaptProfile, adaptListing, adaptOffer, adaptNotification, adaptBroadcast,
  listingToInsert, offerToInsert, broadcastToInsert,
} from '../lib/adapters';
import { fetchOpenListings, fetchUserListings, fetchListing, createListing as createListingService, subscribeToListings } from '../services/listings';
import { fetchBroadcasts, sendBroadcast as sendBroadcastService, reactToBroadcast as reactToBroadcastService, subscribeToBroadcasts } from '../services/broadcasts';
import { fetchProfile, fetchReliability } from '../services/profiles';
import { fetchNotifications, markAllRead as markAllReadService, subscribeToNotifications } from '../services/notifications';
import {
  createOffer as createOfferService,
  acceptOffer as acceptOfferService,
  completeOffer as completeOfferService,
  submitRating as submitRatingService,
  fetchRelevantOffers,
  subscribeToOffers,
} from '../services/offers';

// ─── Context shape ────────────────────────────────────────────────────────────
interface AppContextValue {
  currentUser: User;
  users: User[];
  listings: Listing[];
  offers: Offer[];
  notifications: Notification[];
  broadcasts: CommunityBroadcast[];
  /** True while the initial Supabase fetch is in flight */
  loading: boolean;
  // Actions
  addListing: (listing: Listing) => void;
  addOffer: (offer: Offer) => void;
  acceptOffer: (offerId: string, listingId: string) => void;
  completeOffer: (offerId: string, listingId: string) => void;
  rateOffer: (offerId: string, by: 'requester' | 'helper', rating: number, note?: string) => void;
  markNotificationRead: (notifId: string) => void;
  markAllRead: () => void;
  addBroadcast: (data: Omit<CommunityBroadcast, 'id' | 'reactions' | 'myReaction'>) => void;
  reactToBroadcast: (broadcastId: string, reaction: 'heart' | 'clap' | 'spark') => void;
  markBroadcastsSeen: () => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  // Derived
  unreadCount: number;
  unseenBroadcastCount: number;
  // Lookup helpers
  getUserById: (id: string) => User | undefined;
  getListingById: (id: string) => Listing | undefined;
  getOffersByListing: (listingId: string) => Offer[];
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();

  // Always start with mock data so the UI is never empty
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS.find(u => u.id === 'me')!);
  const [users,         setUsers]         = useState<User[]>(MOCK_USERS);
  const [listings,      setListings]      = useState<Listing[]>(MOCK_LISTINGS);
  const [offers,        setOffers]        = useState<Offer[]>(MOCK_OFFERS);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [broadcasts,    setBroadcasts]    = useState<CommunityBroadcast[]>(MOCK_BROADCASTS);
  const [seenBroadcastCount, setSeenBroadcastCount] = useState(MOCK_BROADCASTS.length);
  const [loading, setLoading] = useState(SUPABASE_CONFIGURED);

  // Keep a stable ref to broadcasts for use inside callbacks without stale closure
  const broadcastsRef = useRef(broadcasts);
  useEffect(() => { broadcastsRef.current = broadcasts; }, [broadcasts]);

  // ── Load public data (listings + broadcasts + their creators) ────────────────
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    let mounted = true;
    setLoading(true);

    async function loadPublicData() {
      try {
        const [listingRows, broadcastRows] = await Promise.all([
          fetchOpenListings(),
          fetchBroadcasts(30),
        ]);
        if (!mounted) return;

        const adaptedListings = listingRows.map(r => adaptListing(r as unknown as Record<string, unknown>));

        // Batch-load profiles for every listing creator
        const requesterIds = [...new Set(adaptedListings.map(l => l.requesterId))];
        const [profileResults, reliabilityResults] = await Promise.all([
          Promise.all(requesterIds.map(id => fetchProfile(id))),
          Promise.all(requesterIds.map(id => fetchReliability(id))),
        ]);
        if (!mounted) return;

        const adaptedUsers: User[] = profileResults
          .map((profile, i) =>
            profile
              ? adaptProfile(
                  profile as unknown as Record<string, unknown>,
                  (reliabilityResults[i] ?? null) as unknown as Record<string, unknown> | null,
                )
              : null,
          )
          .filter((u): u is User => u !== null);

        setListings(adaptedListings);
        setBroadcasts(broadcastRows.map(r => adaptBroadcast(r as unknown as Record<string, unknown>)));
        setSeenBroadcastCount(broadcastRows.length);
        setUsers(prev => {
          const realIds = new Set(adaptedUsers.map(u => u.id));
          return [...adaptedUsers, ...prev.filter(u => !realIds.has(u.id))];
        });
      } catch (err) {
        console.error('[AppContext] loadPublicData error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPublicData();

    // Real-time updates for listings and broadcasts.
    // Merge the single changed row so an open→in_progress transition updates
    // the listing in place rather than dropping it from state.
    const listingsSub = subscribeToListings(({ row, event }) => {
      const adapted = adaptListing(row as unknown as Record<string, unknown>);
      setListings(prev => {
        if (event === 'DELETE') return prev.filter(l => l.id !== adapted.id);
        if (prev.some(l => l.id === adapted.id)) {
          return prev.map(l => l.id === adapted.id ? adapted : l);
        }
        return [adapted, ...prev];
      });
    });
    const broadcastsSub = subscribeToBroadcasts(rows => {
      setBroadcasts(rows.map(r => adaptBroadcast(r as unknown as Record<string, unknown>)));
    });

    return () => {
      mounted = false;
      listingsSub.unsubscribe();
      broadcastsSub.unsubscribe();
    };
  }, []);

  // ── Load per-user data when auth state changes ────────────────────────────
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    // Signed out — clear personal data so the navbar/dashboard don't keep stale info
    if (!authUser) {
      setCurrentUser(MOCK_USERS.find(u => u.id === 'me')!);
      setOffers([]);
      setNotifications([]);
      return;
    }

    // Capture the ID synchronously — closures below are safe regardless of later auth changes
    const userId = authUser.id;
    let mounted = true;

    async function loadUserData() {
      try {
        const [profile, reliability] = await Promise.all([
          fetchProfile(userId),
          fetchReliability(userId),
        ]);
        if (!mounted || !profile) return;

        const adapted = adaptProfile(
          profile as unknown as Record<string, unknown>,
          (reliability ?? null) as unknown as Record<string, unknown> | null,
        );
        setCurrentUser(adapted);
        setUsers(prev => {
          const without = prev.filter(u => u.id !== adapted.id);
          return [adapted, ...without];
        });

        // Load offers: own offers (as helper) + offers received on user's listings
        const offerRows = await fetchRelevantOffers(userId);
        if (mounted) {
          setOffers(offerRows.map(r => adaptOffer(r as unknown as Record<string, unknown>)));
        }

        // Fetch profiles for offerers on our listings who aren't already in state.
        // Without this, OfferCard silently renders nothing because getUserById()
        // returns undefined for helpers the lister hasn't interacted with before.
        const offererIds = [...new Set(offerRows.map(o => o.user_id))].filter(id => id !== userId);
        if (offererIds.length > 0) {
          const offererProfiles = (await Promise.all(offererIds.map(id => fetchProfile(id))))
            .filter((p): p is NonNullable<typeof p> => p !== null);
          if (mounted && offererProfiles.length > 0) {
            const adaptedOfferers = offererProfiles.map(
              p => adaptProfile(p as unknown as Record<string, unknown>),
            );
            setUsers(prev => {
              const existing = new Set(prev.map(u => u.id));
              return [...prev, ...adaptedOfferers.filter(u => !existing.has(u.id))];
            });
          }
        }

        // Load the user's own listings (any status) + listings they've offered
        // on, and merge them into state. The public feed only carries OPEN
        // listings, so without this an accepted/in-progress task vanishes from
        // the dashboard and breaks its chat/listing pages on refresh.
        const ownListings = await fetchUserListings(userId);
        const offeredIds = [...new Set(offerRows.map(o => o.listing_id))]
          .filter(id => !ownListings.some(l => l.id === id));
        const offeredListings = (await Promise.all(offeredIds.map(id => fetchListing(id))))
          .filter((l): l is NonNullable<typeof l> => l !== null);
        const relevantListings = [...ownListings, ...offeredListings];
        if (mounted && relevantListings.length > 0) {
          const adaptedRelevant = relevantListings.map(
            l => adaptListing(l as unknown as Record<string, unknown>),
          );
          const relevantIds = new Set(adaptedRelevant.map(l => l.id));
          setListings(prev => [...adaptedRelevant, ...prev.filter(l => !relevantIds.has(l.id))]);
        }

        // Load notifications
        const notifRows = await fetchNotifications(userId);
        if (mounted) {
          setNotifications(notifRows.map(r => adaptNotification(r as unknown as Record<string, unknown>)));
        }
      } catch (err) {
        console.error('[AppContext] loadUserData error:', err);
      }
    }

    loadUserData();

    // Real-time notification stream for this user
    const notifSub = subscribeToNotifications(userId, rows => {
      setNotifications(rows.map(r => adaptNotification(r as unknown as Record<string, unknown>)));
    });

    // Real-time offer stream — fires when an offer is made on the user's
    // listings (lister) or when one of their own offers changes status (helper)
    const offerSub = subscribeToOffers(userId, rows => {
      if (mounted) setOffers(rows.map(r => adaptOffer(r as unknown as Record<string, unknown>)));
    });

    return () => {
      mounted = false;
      notifSub.unsubscribe();
      offerSub.unsubscribe();
    };
  }, [authUser]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Add a listing. Optimistic update fires immediately so navigation to
   * /listing/:id works without waiting for the DB round-trip.
   * The caller is responsible for using a stable UUID (crypto.randomUUID()).
   */
  const addListing = useCallback((listing: Listing) => {
    setListings(prev => [listing, ...prev]);

    if (!SUPABASE_CONFIGURED || !authUser) return;

    // Fire-and-forget: the optimistic row is already in state.
    // If the insert fails, the listing disappears on next data refresh.
    createListingService(
      listingToInsert({ ...listing, requesterId: authUser.id }) as unknown as Parameters<typeof createListingService>[0],
    ).then(row => {
      if (!row) return;
      const adapted = adaptListing(row as unknown as Record<string, unknown>);
      setListings(prev => prev.map(l => l.id === listing.id ? adapted : l));
    }).catch(err => console.error('[AppContext] addListing DB error:', err));
  }, [authUser]);

  const addOffer = useCallback((offer: Offer) => {
    // Optimistic update
    setOffers(prev => [offer, ...prev]);
    setListings(prev =>
      prev.map(l =>
        l.id === offer.listingId ? { ...l, offerIds: [...l.offerIds, offer.id] } : l,
      ),
    );

    if (!SUPABASE_CONFIGURED || !authUser) return;

    createOfferService(
      offerToInsert({ ...offer, offererId: authUser.id }) as unknown as Parameters<typeof createOfferService>[0],
    ).then(row => {
      if (!row) return;
      const adapted = adaptOffer(row as unknown as Record<string, unknown>);
      setOffers(prev => prev.map(o => o.id === offer.id ? adapted : o));
    }).catch(err => console.error('[AppContext] addOffer DB error:', err));
  }, [authUser]);

  const acceptOffer = useCallback((offerId: string, listingId: string) => {
    // Optimistic update
    setOffers(prev =>
      prev.map(o =>
        o.id === offerId
          ? { ...o, status: 'accepted' }
          : o.listingId === listingId && o.status === 'pending'
          ? { ...o, status: 'declined' }
          : o,
      ),
    );
    setListings(prev =>
      prev.map(l =>
        l.id === listingId ? { ...l, status: 'in-progress', acceptedOfferId: offerId } : l,
      ),
    );

    if (SUPABASE_CONFIGURED) {
      acceptOfferService(offerId, listingId)
        .catch(err => console.error('[AppContext] acceptOffer DB error:', err));
    }
  }, []);

  const completeOffer = useCallback((offerId: string, listingId: string) => {
    // Optimistic update
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'completed' } : o));
    setListings(prev => prev.map(l =>
      l.id === listingId ? { ...l, status: 'completed', updatedAt: new Date().toISOString() } : l,
    ));

    if (SUPABASE_CONFIGURED) {
      completeOfferService(offerId, listingId)
        .catch(err => console.error('[AppContext] completeOffer DB error:', err));
    }
  }, []);

  const rateOffer = useCallback((
    offerId: string,
    by: 'requester' | 'helper',
    rating: number,
    note?: string,
  ) => {
    // Optimistic update
    setOffers(prev => prev.map(o => {
      if (o.id !== offerId) return o;
      return by === 'requester'
        ? { ...o, ratingByRequester: rating, ratingNoteByRequester: note }
        : { ...o, ratingByHelper: rating, ratingNoteByHelper: note };
    }));

    if (SUPABASE_CONFIGURED) {
      submitRatingService(offerId, by, rating, note)
        .catch(err => console.error('[AppContext] rateOffer DB error:', err));
    }
  }, []);

  const markNotificationRead = useCallback((notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (SUPABASE_CONFIGURED && authUser) {
      markAllReadService(authUser.id)
        .catch(err => console.error('[AppContext] markAllRead DB error:', err));
    }
  }, [authUser]);

  const addBroadcast = useCallback((data: Omit<CommunityBroadcast, 'id' | 'reactions' | 'myReaction'>) => {
    const broadcast: CommunityBroadcast = {
      ...data,
      id: `b_new_${Date.now()}`,
      reactions: { heart: 0, clap: 0, spark: 0 },
      myReaction: null,
    };
    setBroadcasts(prev => [broadcast, ...prev]);

    if (!SUPABASE_CONFIGURED || !authUser) return;

    sendBroadcastService(
      broadcastToInsert(data, authUser.id) as unknown as Parameters<typeof sendBroadcastService>[0],
    ).catch(err => console.error('[AppContext] addBroadcast DB error:', err));
  }, [authUser]);

  const reactToBroadcast = useCallback((
    broadcastId: string,
    reaction: 'heart' | 'clap' | 'spark',
  ) => {
    // Determine the new reaction before state update (for the DB call)
    const existing = broadcastsRef.current.find(b => b.id === broadcastId);
    const newReaction = existing?.myReaction === reaction ? null : reaction;

    // Optimistic toggle
    setBroadcasts(prev => prev.map(b => {
      if (b.id !== broadcastId) return b;
      const alreadyReacted = b.myReaction === reaction;
      const updated = { ...b.reactions };
      if (b.myReaction && b.myReaction !== reaction) {
        updated[b.myReaction] = Math.max(0, updated[b.myReaction] - 1);
      }
      if (alreadyReacted) {
        updated[reaction] = Math.max(0, updated[reaction] - 1);
        return { ...b, reactions: updated, myReaction: null };
      }
      updated[reaction] += 1;
      return { ...b, reactions: updated, myReaction: reaction };
    }));

    if (!SUPABASE_CONFIGURED || !authUser) return;

    reactToBroadcastService(broadcastId, authUser.id, newReaction)
      .catch(err => console.error('[AppContext] reactToBroadcast DB error:', err));
  }, [authUser]);

  const markBroadcastsSeen = useCallback(() => {
    setBroadcasts(prev => {
      setSeenBroadcastCount(prev.length);
      return prev;
    });
  }, []);

  /** Merge local updates into currentUser (and users[]) — persistence is the caller's job. */
  const updateCurrentUser = useCallback((updates: Partial<User>) => {
    setCurrentUser(prev => {
      const merged = { ...prev, ...updates };
      setUsers(us => us.map(u => u.id === merged.id ? merged : u));
      return merged;
    });
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.read).length;
  const unseenBroadcastCount = Math.max(0, broadcasts.length - seenBroadcastCount);

  // ── Lookup helpers ─────────────────────────────────────────────────────────
  const getUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);
  const getListingById = useCallback((id: string) => listings.find(l => l.id === id), [listings]);
  const getOffersByListing = useCallback(
    (listingId: string) => offers.filter(o => o.listingId === listingId),
    [offers],
  );

  return (
    <AppContext.Provider value={{
      currentUser, users, listings, offers, notifications, broadcasts,
      loading,
      addListing, addOffer, acceptOffer, completeOffer, rateOffer,
      markNotificationRead, markAllRead,
      addBroadcast, reactToBroadcast, markBroadcastsSeen,
      updateCurrentUser,
      unreadCount, unseenBroadcastCount,
      getUserById, getListingById, getOffersByListing,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
