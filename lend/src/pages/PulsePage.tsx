import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MapPin, ArrowRight, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BroadcastCard } from '../components/common/CommunityPulse';
import { NeighborhoodSelector, NeighborhoodActivity } from '../components/common/NeighborhoodActivity';

export const PulsePage: React.FC = () => {
  const { broadcasts, listings, offers } = useApp();
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filtered = selectedNeighborhood
    ? broadcasts.filter(b =>
        b.areaLabel.toLowerCase().includes(selectedNeighborhood.toLowerCase()),
      )
    : broadcasts;

  const visible = showAll ? filtered : filtered.slice(0, 8);

  // Live city-wide aggregates from real listings + offers
  const cityTotal = useMemo(() => {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const helpers = new Set(offers.map(o => o.offererId)).size;
    const tasks = listings.filter(l =>
      l.status === 'completed' && new Date(l.updatedAt).getTime() > monthAgo,
    ).length;
    return { helpers, tasks };
  }, [offers, listings]);

  // Use the first neighborhood we know about as a default sidebar focus
  const defaultNeighborhood = useMemo(
    () => listings[0]?.location.neighborhood ?? '',
    [listings],
  );

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-900 via-amber-800 to-stone-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-amber-200 mb-6">
            <Sparkles size={14} />
            No account needed to see this
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Your city is<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200">
              looking out for itself.
            </span>
          </h1>
          <p className="text-amber-100 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Every signal here is anonymous. No names. No task details.
            Just a quiet record of neighbors helping neighbors — proof that
            the people around you are more trustworthy than you might think.
          </p>

          {/* City stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-black">{cityTotal.helpers}</div>
              <div className="text-xs text-amber-200">active helpers nearby</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-black">{cityTotal.tasks}</div>
              <div className="text-xs text-amber-200">tasks done this month</div>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-black">{broadcasts.length}</div>
              <div className="text-xs text-amber-200">community signals sent</div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/create"
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950
                font-bold px-6 py-3 rounded-2xl transition-all shadow-lg"
            >
              <Plus size={16} />
              Post a task
            </Link>
            <Link
              to="/browse"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white
                font-semibold px-6 py-3 rounded-2xl border border-white/20 transition-all"
            >
              Browse tasks near you
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Feed column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Neighborhood filter strip */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-600">Filter by neighborhood</span>
              </div>
              <NeighborhoodSelector selected={selectedNeighborhood} onSelect={setSelectedNeighborhood} />
            </div>

            {/* Broadcast cards */}
            <div className="space-y-4">
              {visible.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">🌱</div>
                  <p className="text-slate-500">Nothing yet for {selectedNeighborhood}.</p>
                  <p className="text-sm text-slate-400 mt-1">Be the first to complete a task here.</p>
                </div>
              ) : (
                visible.map(b => <BroadcastCard key={b.id} broadcast={b} />)
              )}
              {!showAll && filtered.length > 8 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full py-3 text-sm font-semibold text-amber-700 bg-amber-50
                    hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
                >
                  Show {filtered.length - 8} more signals ↓
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* About the pulse */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="text-2xl mb-2">✨</div>
              <h3 className="font-bold text-amber-900 mb-2">What is the Community Pulse?</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                When a task goes well on Foster, either person can choose to send
                an anonymous signal to the neighborhood. No names. No task details.
                Just: <em>something good happened here.</em>
              </p>
              <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                Over time, these signals create a kind of ambient trust — a quiet map
                of the city where people are already looking out for each other.
              </p>
            </div>

            {/* Neighborhood stats */}
            {(selectedNeighborhood || defaultNeighborhood) && (
              <NeighborhoodActivity
                neighborhood={selectedNeighborhood || defaultNeighborhood}
              />
            )}

            {/* Join CTA */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-5 text-white text-center">
              <div className="text-3xl mb-2">🤝</div>
              <h3 className="font-bold mb-1">Join Foster</h3>
              <p className="text-sm text-teal-100 mb-4 leading-relaxed">
                You already live here. Start connecting with the people around you.
              </p>
              <Link
                to="/create"
                className="block w-full bg-white text-teal-800 font-bold py-2.5 rounded-xl
                  hover:bg-teal-50 transition-colors text-sm"
              >
                Post your first task →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
