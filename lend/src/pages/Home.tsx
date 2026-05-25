import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Star, Shield, MapPin, Users, Zap, Heart,
  TrendingUp, CheckCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ListingCard } from '../components/listing/ListingCard';
import { Avatar } from '../components/common/Avatar';
import { ReliabilityMeter } from '../components/common/ReliabilityMeter';

const FEATURE_CARDS = [
  {
    icon: <Users size={22} className="text-teal-600" />,
    title: 'Post a Task',
    desc: 'List what you need help with — big or small. Others in your community can offer to assist.',
    color: 'bg-teal-50 border-teal-100',
  },
  {
    icon: <Shield size={22} className="text-purple-600" />,
    title: 'Reliability Scores',
    desc: 'Every helper has a trust score built from real outcomes vs. their self-assessments. Choose wisely.',
    color: 'bg-purple-50 border-purple-100',
  },
  {
    icon: <MapPin size={22} className="text-blue-600" />,
    title: 'Local First',
    desc: 'Tasks and helpers are matched by proximity. Closer helpers are often more practical and reliable.',
    color: 'bg-blue-50 border-blue-100',
  },
  {
    icon: <Heart size={22} className="text-rose-600" />,
    title: 'Return the Favor',
    desc: 'Great connections don\'t end at one task. Help someone, and they can lend a hand back when you need it.',
    color: 'bg-rose-50 border-rose-100',
  },
];

const STATS = [
  { value: '2,400+', label: 'Tasks Completed', icon: <CheckCircle size={18} className="text-emerald-500" /> },
  { value: '1,800+', label: 'Active Helpers',  icon: <Users size={18} className="text-blue-500" /> },
  { value: '4.82★', label: 'Avg. Rating',      icon: <Star size={18} className="text-amber-500" /> },
  { value: '94%',   label: 'Follow-through',   icon: <TrendingUp size={18} className="text-teal-500" /> },
];

export const Home: React.FC = () => {
  const { listings, users } = useApp();

  const recentOpen = listings
    .filter(l => l.status === 'open')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const topHelpers = users
    .filter(u => u.id !== 'me' && u.reliability.totalOffers >= 5)
    .sort((a, b) => b.reliability.overall - a.reliability.overall)
    .slice(0, 4);

  return (
    <div className="page-enter">
      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-teal-400 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-blue-500 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6 text-sm font-medium text-teal-200">
            <Zap size={14} className="text-teal-300" />
            Community-powered assistance network
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6">
            Lend a hand.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300">
              Build trust.
            </span>
          </h1>

          <p className="text-xl text-teal-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            Post tasks you need help with. Find community members ready to step up.
            Build real relationships through real actions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/create"
              className="inline-flex items-center gap-2 bg-teal-400 hover:bg-teal-300 text-teal-950 font-bold
                px-8 py-4 rounded-2xl text-lg transition-all shadow-lg hover:shadow-teal-400/30 hover:-translate-y-0.5"
            >
              Post a Task
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold
                px-8 py-4 rounded-2xl text-lg transition-all border border-white/20 backdrop-blur-sm"
            >
              Browse Listings
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            {STATS.map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-4 border border-white/10">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-xs text-teal-200 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-900 mb-3">How Lend Works</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            A simple loop of posting, offering, completing, and building trust.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURE_CARDS.map((card, i) => (
            <div key={i} className={`rounded-2xl border p-6 ${card.color}`}>
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4">
                {card.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{card.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── RECENT LISTINGS ──────────────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Recent Tasks Near You</h2>
            <p className="text-slate-500 text-sm mt-1">Open tasks in your area looking for helpers</p>
          </div>
          <Link
            to="/browse"
            className="flex items-center gap-1.5 text-teal-600 hover:text-teal-700 font-semibold text-sm"
          >
            View all <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentOpen.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* ── TOP HELPERS ──────────────────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Trusted Helpers in Your Area</h2>
            <p className="text-slate-500 text-sm mt-1">Top-rated community members ready to lend a hand</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {topHelpers.map(user => (
            <Link
              key={user.id}
              to={`/profile/${user.id}`}
              className="block bg-white rounded-2xl border border-slate-200 p-5 card-hover"
            >
              <div className="flex items-start gap-3 mb-4">
                <Avatar user={user} size="lg" showOnline />
                <div>
                  <p className="font-bold text-slate-900 leading-tight">{user.displayName}</p>
                  <p className="text-xs text-slate-400">@{user.username}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin size={10} /> {user.location.displayName}
                  </p>
                </div>
              </div>
              <ReliabilityMeter reliability={user.reliability} compact />
              <div className="mt-3 flex flex-wrap gap-1">
                {user.skills.slice(0, 3).map(s => (
                  <span key={s} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{s}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-teal-600 to-teal-800 rounded-3xl p-10 text-center text-white shadow-xl">
          <h2 className="text-3xl font-black mb-4">Ready to build your community credit?</h2>
          <p className="text-teal-100 mb-8 text-lg max-w-xl mx-auto">
            Every task you help with is a brick in the foundation of trust. Start lending today.
          </p>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 bg-white text-teal-800 font-bold px-8 py-4 rounded-2xl
              hover:bg-teal-50 transition-all shadow-lg"
          >
            Find Tasks to Help With
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};
