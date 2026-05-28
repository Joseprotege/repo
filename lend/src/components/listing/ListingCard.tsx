import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Eye, Users, Wifi } from 'lucide-react';
import type { Listing } from '../../types';
import { useApp } from '../../context/AppContext';
import { CategoryBadge, UrgencyBadge, StatusBadge } from '../common/Badge';
import { Avatar } from '../common/Avatar';

interface Props {
  listing: Listing;
  compact?: boolean;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const ListingCard: React.FC<Props> = ({ listing, compact = false }) => {
  const { getUserById, getOffersByListing } = useApp();
  const requester = getUserById(listing.requesterId);
  const offerCount = getOffersByListing(listing.id).length;
  const isNew = Date.now() - new Date(listing.createdAt).getTime() < 24 * 60 * 60 * 1000;

  if (!requester) return null;

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="block bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover group"
    >
      {/* Image */}
      {!compact && listing.imageUrls[0] && (
        <div className="relative h-44 overflow-hidden bg-slate-100">
          <img
            src={listing.imageUrls[0]}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            <CategoryBadge category={listing.category} size="sm" />
            {isNew && (
              <span className="text-[11px] font-bold px-2 py-0.5 bg-teal-600 text-white rounded-full badge-new">
                NEW
              </span>
            )}
          </div>
          <div className="absolute top-3 right-3">
            <StatusBadge status={listing.status} />
          </div>
          {listing.status !== 'open' && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
          )}
        </div>
      )}

      <div className="p-4">
        {/* Compact: badges on top */}
        {compact && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <CategoryBadge category={listing.category} size="sm" />
            <StatusBadge status={listing.status} />
          </div>
        )}

        {/* Title + paid badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors flex-1">
            {listing.title}
          </h3>
          {listing.isPaid && listing.budgetCents > 0 && (
            <span className="flex-shrink-0 text-[11px] font-bold px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">
              💰 ${Math.round(listing.budgetCents / 100)}
            </span>
          )}
        </div>

        {/* Description preview */}
        {!compact && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">
            {listing.description}
          </p>
        )}

        {/* Tags */}
        {!compact && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {listing.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin size={11} className="text-slate-400" />
            {listing.location.neighborhood
              ? `${listing.location.neighborhood}, ${listing.location.city}`
              : listing.location.displayName}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} className="text-slate-400" />
            ~{listing.estimatedHours}h
          </span>
          {listing.canBeRemote && (
            <span className="flex items-center gap-1 text-indigo-500">
              <Wifi size={11} />
              Remote OK
            </span>
          )}
        </div>

        {/* Bottom row: requester + stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar user={requester} size="xs" showOnline />
            <span className="text-xs text-slate-600 font-medium">{requester.displayName}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Users size={11} />
              {offerCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={11} />
              {listing.views}
            </span>
            <span>{timeAgo(listing.createdAt)}</span>
          </div>
        </div>

        {/* Urgency strip */}
        {listing.urgency === 'urgent' && (
          <div className="mt-3 -mx-4 -mb-4 px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-red-600">Urgent — needs help soon</span>
          </div>
        )}
        {listing.urgency === 'high' && (
          <div className="mt-2 flex items-center gap-1">
            <UrgencyBadge urgency={listing.urgency} />
          </div>
        )}
      </div>
    </Link>
  );
};
