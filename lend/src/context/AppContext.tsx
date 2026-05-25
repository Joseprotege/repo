import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, Listing, Offer, Notification, CommunityBroadcast } from '../types';
import {
  MOCK_USERS, MOCK_LISTINGS, MOCK_OFFERS, MOCK_NOTIFICATIONS, MOCK_BROADCASTS,
} from '../data/mockData';

interface AppContextValue {
  // Auth
  currentUser: User;
  // Data
  users: User[];
  listings: Listing[];
  offers: Offer[];
  notifications: Notification[];
  broadcasts: CommunityBroadcast[];
  // Actions
  addListing: (listing: Listing) => void;
  addOffer: (offer: Offer) => void;
  acceptOffer: (offerId: string, listingId: string) => void;
  markNotificationRead: (notifId: string) => void;
  markAllRead: () => void;
  addBroadcast: (broadcast: Omit<CommunityBroadcast, 'id' | 'reactions' | 'myReaction'>) => void;
  reactToBroadcast: (broadcastId: string, reaction: 'heart' | 'clap' | 'spark') => void;
  markBroadcastsSeen: () => void;
  // Counts
  unreadCount: number;
  unseenBroadcastCount: number;
  // UI helpers
  getUserById: (id: string) => User | undefined;
  getListingById: (id: string) => Listing | undefined;
  getOffersByListing: (listingId: string) => Offer[];
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser] = useState<User>(MOCK_USERS.find(u => u.id === 'me')!);
  const [users] = useState<User[]>(MOCK_USERS);
  const [listings, setListings] = useState<Listing[]>(MOCK_LISTINGS);
  const [offers, setOffers] = useState<Offer[]>(MOCK_OFFERS);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [broadcasts, setBroadcasts] = useState<CommunityBroadcast[]>(MOCK_BROADCASTS);
  // Track how many broadcasts existed when the user last opened the Nearby tab
  const [seenBroadcastCount, setSeenBroadcastCount] = useState(MOCK_BROADCASTS.length);

  const addListing = useCallback((listing: Listing) => {
    setListings(prev => [listing, ...prev]);
  }, []);

  const addOffer = useCallback((offer: Offer) => {
    setOffers(prev => [offer, ...prev]);
    setListings(prev =>
      prev.map(l =>
        l.id === offer.listingId
          ? { ...l, offerIds: [...l.offerIds, offer.id] }
          : l,
      ),
    );
  }, []);

  const acceptOffer = useCallback((offerId: string, listingId: string) => {
    setOffers(prev =>
      prev.map(o =>
        o.id === offerId ? { ...o, status: 'accepted' } :
        o.listingId === listingId && o.status === 'pending' ? { ...o, status: 'declined' } : o,
      ),
    );
    setListings(prev =>
      prev.map(l =>
        l.id === listingId ? { ...l, status: 'in-progress', acceptedOfferId: offerId } : l,
      ),
    );
  }, []);

  const markNotificationRead = useCallback((notifId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, read: true } : n),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const addBroadcast = useCallback((
    data: Omit<CommunityBroadcast, 'id' | 'reactions' | 'myReaction'>,
  ) => {
    const broadcast: CommunityBroadcast = {
      ...data,
      id: `b_new_${Date.now()}`,
      reactions: { heart: 0, clap: 0, spark: 0 },
      myReaction: null,
    };
    setBroadcasts(prev => [broadcast, ...prev]);
    // New broadcast is unseen — don't bump seenCount
  }, []);

  const reactToBroadcast = useCallback((
    broadcastId: string,
    reaction: 'heart' | 'clap' | 'spark',
  ) => {
    setBroadcasts(prev => prev.map(b => {
      if (b.id !== broadcastId) return b;
      const alreadyReacted = b.myReaction === reaction;
      const prev_reactions = { ...b.reactions };
      // Toggle: remove old reaction count, add new (or remove if same)
      if (b.myReaction && b.myReaction !== reaction) {
        prev_reactions[b.myReaction] = Math.max(0, prev_reactions[b.myReaction] - 1);
      }
      if (alreadyReacted) {
        prev_reactions[reaction] = Math.max(0, prev_reactions[reaction] - 1);
        return { ...b, reactions: prev_reactions, myReaction: null };
      } else {
        prev_reactions[reaction] = prev_reactions[reaction] + 1;
        return { ...b, reactions: prev_reactions, myReaction: reaction };
      }
    }));
  }, []);

  const markBroadcastsSeen = useCallback(() => {
    setSeenBroadcastCount(prev => {
      const currentCount = broadcasts.length;
      return currentCount > prev ? currentCount : prev;
    });
    // Use functional form to get latest broadcasts length
    setBroadcasts(prev => {
      setSeenBroadcastCount(prev.length);
      return prev;
    });
  }, [broadcasts.length]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const unseenBroadcastCount = Math.max(0, broadcasts.length - seenBroadcastCount);

  const getUserById = useCallback(
    (id: string) => users.find(u => u.id === id),
    [users],
  );

  const getListingById = useCallback(
    (id: string) => listings.find(l => l.id === id),
    [listings],
  );

  const getOffersByListing = useCallback(
    (listingId: string) => offers.filter(o => o.listingId === listingId),
    [offers],
  );

  return (
    <AppContext.Provider value={{
      currentUser, users, listings, offers, notifications, broadcasts,
      addListing, addOffer, acceptOffer,
      markNotificationRead, markAllRead,
      addBroadcast, reactToBroadcast, markBroadcastsSeen,
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
