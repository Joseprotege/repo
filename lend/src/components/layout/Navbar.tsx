import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, Plus, Search, Menu, X, Home, LayoutGrid,
  User as UserIcon, LogOut, ChevronDown, Sparkles, LogIn,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SUPABASE_CONFIGURED } from '../../lib/supabase';
import { Avatar } from '../common/Avatar';
import { BroadcastCard } from '../common/CommunityPulse';

type NotifTab = 'mine' | 'nearby';

export const Navbar: React.FC = () => {
  const {
    currentUser, notifications, markAllRead, unreadCount,
    broadcasts, unseenBroadcastCount, markBroadcastsSeen,
  } = useApp();
  const { signOut, user: authUser } = useAuth();
  const isAuthed = !SUPABASE_CONFIGURED || !!authUser;
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<NotifTab>('mine');
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/browse?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const handleOpenNotif = () => {
    setNotifOpen(v => !v);
    setProfileOpen(false);
  };

  const handleTabChange = (tab: NotifTab) => {
    setNotifTab(tab);
    if (tab === 'nearby') markBroadcastsSeen();
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: <Home size={16} /> },
    { to: '/browse', label: 'Browse', icon: <LayoutGrid size={16} /> },
    { to: '/dashboard', label: 'My Tasks', icon: <UserIcon size={16} /> },
    { to: '/pulse', label: 'Pulse', icon: <Sparkles size={16} /> },
  ];

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  // Total badge = personal unread + unseen broadcasts
  const totalBadge = unreadCount + unseenBroadcastCount;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-lg leading-none">F</span>
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">Foster</span>
          </Link>

          {/* Search bar — desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search for tasks, skills, people…"
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-full
                  focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>
          </form>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive(link.to)
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-4">
            {/* Post listing CTA — signed-in users only */}
            {isAuthed && (
              <Link
                to="/create"
                className="hidden sm:flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white
                  text-sm font-semibold px-4 py-2 rounded-full transition-colors shadow-sm"
              >
                <Plus size={15} />
                Post a Task
              </Link>
            )}

            {/* Signed-out CTAs */}
            {!isAuthed && (
              <>
                <Link
                  to="/login"
                  className="hidden sm:flex items-center gap-1.5 text-slate-700 hover:bg-slate-100
                    text-sm font-semibold px-4 py-2 rounded-full transition-colors"
                >
                  <LogIn size={15} />
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white
                    text-sm font-semibold px-4 py-2 rounded-full transition-colors shadow-sm"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Notifications bell — signed-in only */}
            {isAuthed && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleOpenNotif}
                className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Bell size={20} />
                {totalBadge > 0 && (
                  <span className={`absolute top-1 right-1 w-4 h-4 text-white text-[10px]
                    font-bold rounded-full flex items-center justify-center leading-none
                    ${unseenBroadcastCount > 0 && unreadCount === 0
                      ? 'bg-amber-400'   // only community news → warm amber
                      : 'bg-red-500'     // personal notifs → red
                    }`}>
                    {totalBadge > 9 ? '9+' : totalBadge}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  {/* Two-tab header */}
                  <div className="flex border-b border-slate-100">
                    <button
                      onClick={() => handleTabChange('mine')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors
                        ${notifTab === 'mine'
                          ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/40'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Bell size={14} />
                      Mine
                      {unreadCount > 0 && (
                        <span className="w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleTabChange('nearby')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors
                        ${notifTab === 'nearby'
                          ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50/40'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Sparkles size={14} />
                      Nearby
                      {unseenBroadcastCount > 0 && notifTab !== 'nearby' && (
                        <span className="w-4 h-4 bg-amber-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unseenBroadcastCount > 9 ? '9+' : unseenBroadcastCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* ── MINE tab ── */}
                  {notifTab === 'mine' && (
                    <>
                      {unreadCount > 0 && (
                        <div className="flex justify-end px-4 py-2 border-b border-slate-50">
                          <button
                            onClick={markAllRead}
                            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                          >
                            Mark all read
                          </button>
                        </div>
                      )}
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-slate-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.slice(0, 8).map(n => (
                            <Link
                              key={n.id}
                              to={n.linkTo || '#'}
                              onClick={() => setNotifOpen(false)}
                              className={`block px-4 py-3 hover:bg-slate-50 transition-colors
                                ${!n.read ? 'bg-teal-50/50' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                {!n.read && (
                                  <span className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                                )}
                                <div className={!n.read ? '' : 'ml-4'}>
                                  <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                                </div>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {/* ── NEARBY tab ── */}
                  {notifTab === 'nearby' && (
                    <div className="max-h-96 overflow-y-auto">
                      {/* Header context line */}
                      <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                        <p className="text-xs text-amber-800 font-medium">
                          Anonymous signals from people helping each other nearby.
                          No names. No task details. Just good news.
                        </p>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {broadcasts.slice(0, 6).map(b => (
                          <BroadcastCard key={b.id} broadcast={b} compact />
                        ))}
                      </div>
                      <div className="px-4 py-3 border-t border-slate-100">
                        <Link
                          to="/"
                          onClick={() => setNotifOpen(false)}
                          className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center justify-center gap-1"
                        >
                          <Sparkles size={12} />
                          See the full Community Pulse →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Profile dropdown — signed-in only */}
            {isAuthed && (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <Avatar user={currentUser} size="sm" showOnline />
                <ChevronDown size={14} className="text-slate-500 hidden sm:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800">{currentUser.displayName}</p>
                    <p className="text-xs text-slate-400">@{currentUser.username}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/profile/me"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <UserIcon size={15} /> My Profile
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <LayoutGrid size={15} /> Dashboard
                    </Link>
                    <hr className="my-1 border-slate-100" />
                    <button
                      onClick={async () => {
                        setProfileOpen(false);
                        await signOut();
                        navigate(SUPABASE_CONFIGURED ? '/login' : '/');
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-full text-slate-600 hover:bg-slate-100"
              onClick={() => setMobileOpen(v => !v)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          <form onSubmit={handleSearch} className="mb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 rounded-full
                  focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </form>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium
                ${isActive(link.to) ? 'bg-teal-50 text-teal-700' : 'text-slate-600'}`}
            >
              {link.icon} {link.label}
            </Link>
          ))}
          {isAuthed ? (
            <Link
              to="/create"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 bg-teal-600 text-white px-3 py-2.5 rounded-lg text-sm font-semibold"
            >
              <Plus size={16} /> Post a Task
            </Link>
          ) : (
            <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogIn size={16} /> Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 bg-teal-600 text-white px-3 py-2.5 rounded-lg text-sm font-semibold"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
