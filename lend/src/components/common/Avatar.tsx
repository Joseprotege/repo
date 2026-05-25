import React from 'react';
import type { User } from '../../types';

interface Props {
  user: User;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
}

const SIZE = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-lg',
};

const DOT_SIZE = {
  xs: 'w-1.5 h-1.5 border',
  sm: 'w-2 h-2 border',
  md: 'w-2.5 h-2.5 border-2',
  lg: 'w-3 h-3 border-2',
  xl: 'w-4 h-4 border-2',
};

export const Avatar: React.FC<Props> = ({ user, size = 'md', showOnline = false }) => {
  return (
    <div className="relative flex-shrink-0">
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        className={`${SIZE[size]} rounded-full object-cover bg-slate-200 ring-2 ring-white`}
      />
      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-white
            ${DOT_SIZE[size]} ${user.isOnline ? 'bg-emerald-400' : 'bg-slate-300'}`}
        />
      )}
    </div>
  );
};
