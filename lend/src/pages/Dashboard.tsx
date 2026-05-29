import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, CheckCircle, Clock, AlertTriangle, ArrowRight, Star, BarChart3,
  Handshake, ListTodo, MessageCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ListingCard } from '../components/listing/ListingCard';
import { ReliabilityMeter } from '../components/common/ReliabilityMeter';
import { OfferCard } from '../components/offer/OfferCard';
import { Avatar } from '../components/common/Avatar';

type DashTab = 'overview' | 'my-listings' | 'my-offers' | 'connections';

export const Dashboard: React.FC = () => {
  const { currentUser, listings, offers, users } = useApp();
  const [tab, setTab] = useState<DashTab>('overview');

  const myListings = listings.filter(l => l.requesterId === currentUser.id);
  const myOffers = offers.filter(o => o.offererId === currentUser.id);
  const connections = users.filter(u => currentUser.connectionIds.includes(u.id));

  const openListings = myListings.filter(l => l.status === 'open');
  const inProgressListings = myListings.filter(l => l.status === 'in-progress');
  const completedListings = myListings.filter(l => l.status === 'completed');

  const incomingOffers = offers.filter(o => {
    const listing = listings.find(l => l.id === o.listingId);
    return listing?.requesterId === currentUser.id && o.status === 'pending';
  });

  const OVERVIEW_STATS = [
    { label: 'Open Tasks',     value: openListings.length,    icon: <ListTodo size={20} className="text-blue-500" />,     color: 'bg-blue-50 border-blue-100' },
    { label: 'In Progress',    value: inProgressListings.length, icon: <Clock size={20} className="text-amber-500" />,    color: 'bg-amber-50 border-amber-100' },
    { label: 'Completed',      value: completedListings.length, icon: <CheckCircle size={20} className="text-emerald-500" />, color: 'bg-emerald-50 border-emerald-100' },
    { label: 'My Offers Out',  value: myOffers.length,         icon: <Handshake size={20} className="text-purple-500" />, color: 'bg-purple-50 border-purple-100' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Avatar user={currentUser} size="lg" showOnline />
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Hey, {currentUser.displayName.split(' ')[0]}! 👋
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Your Foster dashboard</p>
          </div>
        </div>
        <Link
          to="/create"
          className="hidden sm:flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white
            font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={15} /> Post a Task
        </Link>
      </div>

      {/* Incoming offers alert */}
      {incomingOffers.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">
                You have {incomingOffers.length} pending offer{incomingOffers.length > 1 ? 's' : ''}!
              </p>
              <p className="text-sm text-amber-700">Review and accept or decline helpers for your tasks.</p>
            </div>
          </div>
          <button
            onClick={() => setTab('my-listings')}
            className="flex items-center gap-1 text-sm font-bold text-amber-700 hover:text-amber-900 whitespace-nowrap"
          >
            View <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {([
          ['overview',     'Overview'],
          ['my-listings',  `My Tasks (${myListings.length})`],
          ['my-offers',    `My Offers (${myOffers.length})`],
          ['connections',  `Connections (${connections.length})`],
        ] as [DashTab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap
              ${tab === t ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {OVERVIEW_STATS.map(s => (
              <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
                {s.icon}
                <div className="text-3xl font-black text-slate-900 mt-2">{s.value}</div>
                <div className="text-sm text-slate-600 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Reliability card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-teal-600" />
              <h2 className="font-bold text-slate-900">Your Reliability Score</h2>
              <Link to="/profile/me" className="ml-auto text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                Full profile <ArrowRight size={13} />
              </Link>
            </div>
            <ReliabilityMeter reliability={currentUser.reliability} showBreakdown />
            {currentUser.reliability.totalOffers === 0 && (
              <div className="mt-4 bg-teal-50 border border-teal-100 rounded-xl p-4">
                <p className="text-sm text-teal-800 font-medium mb-1">🚀 Start building your score</p>
                <p className="text-xs text-teal-700">
                  Make offers on tasks and complete them to build your reliability score and attract more connections.
                </p>
                <Link to="/browse" className="inline-block mt-2 text-xs font-bold text-teal-600">
                  Browse tasks →
                </Link>
              </div>
            )}
          </div>

          {/* Recent activity */}
          {myListings.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900">Recent Tasks</h2>
                <button onClick={() => setTab('my-listings')} className="text-sm text-teal-600 font-medium">
                  View all →
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {myListings.slice(0, 2).map(l => <ListingCard key={l.id} listing={l} compact />)}
              </div>
            </div>
          )}

          {myListings.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <div className="text-5xl mb-3">📋</div>
              <h3 className="font-bold text-slate-800 mb-1">No tasks yet</h3>
              <p className="text-slate-500 text-sm mb-5">Post your first task and see your community rally around you.</p>
              <Link
                to="/create"
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                <Plus size={15} /> Post a Task
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── MY LISTINGS ─────────────────────────────────────────── */}
      {tab === 'my-listings' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Link
              to="/create"
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm"
            >
              <Plus size={14} /> New Task
            </Link>
          </div>
          {myListings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-slate-500">No tasks yet. Post one and get help!</p>
            </div>
          ) : (
            <div className="space-y-5">
              {myListings.map(l => {
                // Prefer the persisted acceptedOfferId, but fall back to scanning
                // offers — older accepted tasks never had accepted_offer_id stored.
                const acceptedOffer =
                  (l.acceptedOfferId && offers.find(o => o.id === l.acceptedOfferId)) ||
                  offers.find(o => o.listingId === l.id && (o.status === 'accepted' || o.status === 'completed')) ||
                  null;
                return (
                  <div key={l.id}>
                    <ListingCard listing={l} />
                    {acceptedOffer && (l.status === 'in-progress' || l.status === 'completed') && (
                      <div className="mt-2 flex justify-end">
                        <Link
                          to={`/chat/${acceptedOffer.id}`}
                          className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg px-3 py-1.5 transition-colors"
                        >
                          <MessageCircle size={12} />
                          Open Task Chat
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MY OFFERS ───────────────────────────────────────────── */}
      {tab === 'my-offers' && (
        <div className="space-y-4">
          {myOffers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <div className="text-5xl mb-3">🙋</div>
              <p className="text-slate-500 mb-4">You haven't made any offers yet.</p>
              <Link to="/browse" className="text-teal-600 font-semibold">Browse tasks to help with →</Link>
            </div>
          ) : (
            myOffers.map(o => {
              const listing = listings.find(l => l.id === o.listingId);
              const isAccepted = o.status === 'accepted' || o.status === 'completed';
              return (
                <div key={o.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {listing && (
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                      <Link
                        to={`/listing/${listing.id}`}
                        className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                      >
                        <p className="text-sm font-semibold text-slate-800 line-clamp-1">{listing.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{listing.location.displayName}</p>
                      </Link>
                      {isAccepted && (
                        <Link
                          to={`/chat/${o.id}`}
                          className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg px-2.5 py-1.5 transition-colors flex-shrink-0"
                        >
                          <MessageCircle size={12} />
                          Task Chat
                        </Link>
                      )}
                    </div>
                  )}
                  <div className="p-5">
                    <OfferCard offer={o} isOwner={false} expanded />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── CONNECTIONS ─────────────────────────────────────────── */}
      {tab === 'connections' && (
        <div className="space-y-4">
          {connections.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <div className="text-5xl mb-3">🤝</div>
              <p className="text-slate-500 mb-2">No connections yet.</p>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Connections form naturally when you and another user exchange help.
                Start by posting tasks or making offers!
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map(conn => (
                <Link
                  key={conn.id}
                  to={`/profile/${conn.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-4 card-hover"
                >
                  <Avatar user={conn} size="md" showOnline />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{conn.displayName}</p>
                    <p className="text-xs text-slate-400">@{conn.username}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={11} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs text-slate-600">
                        {conn.reliability.avgRating > 0 ? conn.reliability.avgRating.toFixed(1) : '—'}
                      </span>
                      <span className="text-xs text-slate-400">reliability: {conn.reliability.overall}</span>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-400" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
