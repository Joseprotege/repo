import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, Listing, Offer, Notification } from '../types';
import {
  MOCK_USERS, MOCK_LISTINGS, MOCK_OFFERS, MOCK_NOTIFICATIONS,
} from '../data/mockData';

interface AppContextValue {
  // Auth
  currentUser: User;
  // Data
  users: User[];
  listings: Listing[];
  offers: Offer[];
  notifications: Notification[];
  // Actions
  addListing: (listing: Listing) => void;
  addOffer: (offer: Offer) => void;
  acceptOffer: (offerId: string, listingId: string) => void;
  markNotificationRead: (notifId: string) => void;
  markAllRead: () => void;
  unreadCount: number;
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

  const unreadCount = notifications.filter(n => !n.read).length;

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
      currentUser, users, listings, offers, notifications,
      addListing, addOffer, acceptOffer,
      markNotificationRead, markAllRead, unreadCount,
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
