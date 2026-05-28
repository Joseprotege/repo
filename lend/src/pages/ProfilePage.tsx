import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Shield, CheckCircle, Star, ArrowRight, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Avatar } from '../components/common/Avatar';
import { ReliabilityMeter } from '../components/common/ReliabilityMeter';
import { ListingCard } from '../components/listing/ListingCard';
import { EditProfileModal } from '../components/common/EditProfileModal';
import { ReportModal } from '../components/common/ReportModal';
import { StripeConnectCard } from '../components/user/StripeConnectCard';
import { Flag } from 'lucide-react';

type Tab = 'listings' | 'reliability' | 'connections';

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getUserById, currentUser, listings, users, updateCurrentUser } = useApp();
  const [tab, setTab] = useState<Tab>('listings');
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);

  const userId = id === 'me' ? currentUser.id : id!;
  const user = userId === currentUser.id ? currentUser : getUserById(userId);
  const isMe = userId === currentUser.id;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-4">👤</div>
        <h2 className="text-2xl font-bold text-slate-700 mb-4">User not found</h2>
        <Link to="/" className="text-teal-600 font-semibold">Go home →</Link>
      </div>
    );
  }

  const userListings = listings.filter(l => l.requesterId === userId);
  const connections = users.filter(u => user.connectionIds.includes(u.id));
  const completedListings = userListings.filter(l => l.status === 'completed');

  const LEVEL_COLORS: Record<string, string> = {
    new: 'from-slate-400 to-slate-500',
    rising: 'from-blue-400 to-blue-600',
    trusted: 'from-teal-400 to-teal-600',
    expert: 'from-purple-400 to-purple-600',
    legendary: 'from-amber-400 to-amber-600',
  };

  return (
    <div className="page-enter">
      {/* Profile header */}
      <div className={`bg-gradient-to-br ${LEVEL_COLORS[user.reliability.level]} text-white`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
            <div className="relative">
              <Avatar user={user} size="xl" showOnline />
              {user.verifiedId && (
                <span className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                  <Shield size={13} className="text-white" />
                </span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-start gap-3 flex-wrap">
                <h1 className="text-3xl font-black">{user.displayName}</h1>
                {isMe ? (
                  <>
                    <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full mt-1">
                      That's you!
                    </span>
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1 text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors px-3 py-1.5 rounded-full mt-1"
                    >
                      <Pencil size={12} /> Edit profile
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setReporting(true)}
                    title="Report this profile"
                    className="flex items-center gap-1 text-xs font-semibold bg-white/15 hover:bg-red-500/30 transition-colors px-3 py-1.5 rounded-full mt-1"
                  >
                    <Flag size={12} /> Report
                  </button>
                )}
              </div>
              <p className="text-white/70 text-sm mb-2">@{user.username}</p>
              <div className="flex flex-wrap gap-4 text-sm text-white/80">
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-white/60" />
                  {user.location.displayName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-white/60" />
                  Joined {new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                {user.verifiedId && (
                  <span className="flex items-center gap-1 font-semibold">
                    <Shield size={13} /> ID Verified
                  </span>
                )}
              </div>
              <p className="mt-3 text-white/90 max-w-xl">{user.bio}</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 sm:min-w-64">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                <div className="text-2xl font-black">{user.reliability.completedOffers}</div>
                <div className="text-xs text-white/70">Tasks Done</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                <div className="text-2xl font-black">{user.reliability.avgRating > 0 ? user.reliability.avgRating.toFixed(1) : '—'}</div>
                <div className="text-xs text-white/70">Avg Rating</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                <div className="text-2xl font-black">{connections.length}</div>
                <div className="text-xs text-white/70">Connections</div>
              </div>
            </div>
          </div>

          {/* Skills */}
          {user.skills.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {user.skills.map(s => (
                <span key={s} className="text-sm px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full border border-white/20">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {([
              ['listings', `Tasks (${userListings.length})`],
              ['reliability', 'Reliability Score'],
              ['connections', `Connections (${connections.length})`],
            ] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-4 text-sm font-semibold border-b-2 transition-colors
                  ${tab === t
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === 'listings' && (
          <div className="space-y-6">
            {isMe && <StripeConnectCard userId={user.id} />}

            {isMe && (
              <div className="flex justify-end">
                <Link
                  to="/create"
                  className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white
                    font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
                >
                  + Post New Task
                </Link>
              </div>
            )}

            {userListings.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">📋</div>
                <p className="text-slate-500 mb-4">
                  {isMe ? "You haven't posted any tasks yet." : "This user hasn't posted any tasks."}
                </p>
                {isMe && (
                  <Link to="/create" className="text-teal-600 font-semibold">Post your first task →</Link>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {userListings.map(l => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}
          </div>
        )}

        {tab === 'reliability' && (
          <div className="max-w-2xl space-y-6">
            <ReliabilityMeter reliability={user.reliability} showBreakdown />

            {/* Star ratings breakdown */}
            {user.reliability.avgRating > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="font-bold text-slate-800 mb-4">Rating Breakdown</p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-5xl font-black text-slate-800">{user.reliability.avgRating.toFixed(1)}</div>
                  <div>
                    <div className="flex gap-0.5 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          className={i < Math.round(user.reliability.avgRating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200 fill-slate-200'}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-slate-500">
                      Based on {user.reliability.completedOffers} completed task{user.reliability.completedOffers !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Completed listings */}
            {completedListings.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-800 mb-3">Completed Tasks</h3>
                <div className="grid gap-3">
                  {completedListings.map(l => (
                    <Link
                      key={l.id}
                      to={`/listing/${l.id}`}
                      className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors"
                    >
                      <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700 font-medium flex-1">{l.title}</span>
                      <ArrowRight size={14} className="text-slate-400" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {isMe && user.reliability.totalOffers === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
                <div className="text-3xl mb-2">🚀</div>
                <p className="font-semibold text-blue-900 mb-1">Build your reliability score</p>
                <p className="text-sm text-blue-700">
                  Start by making offers on tasks near you. Each completed task builds your score and trust.
                </p>
                <Link to="/browse" className="inline-block mt-3 text-sm font-bold text-blue-600 hover:text-blue-700">
                  Browse tasks →
                </Link>
              </div>
            )}
          </div>
        )}

        {tab === 'connections' && (
          <div className="space-y-4">
            {connections.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🤝</div>
                <p className="text-slate-500">
                  {isMe ? "You haven't formed any connections yet." : "No connections yet."}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Connections form when mutual help is exchanged between users.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {connections.map(conn => (
                  <Link
                    key={conn.id}
                    to={`/profile/${conn.id}`}
                    className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4 card-hover"
                  >
                    <Avatar user={conn} size="md" showOnline />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{conn.displayName}</p>
                      <p className="text-xs text-slate-400">@{conn.username}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {conn.location.displayName}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-teal-600">{conn.reliability.overall}</div>
                      <div className="text-[10px] text-slate-400">Score</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {editing && isMe && (
        <EditProfileModal
          user={user}
          onClose={() => setEditing(false)}
          onSaved={updates => updateCurrentUser(updates)}
        />
      )}

      {reporting && !isMe && (
        <ReportModal
          targetType="profile"
          targetId={user.id}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
};
