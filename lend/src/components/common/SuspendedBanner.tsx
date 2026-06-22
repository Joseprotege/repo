/**
 * SuspendedBanner — shown app-wide when the signed-in user has been suspended
 * by a moderator. Their posting/offering/broadcasting is already blocked at the
 * database (RLS); this explains why so the failures aren't silent.
 */
import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SuspendedBanner: React.FC = () => {
  const { currentUser } = useApp();
  if (!currentUser.isSuspended) return null;

  return (
    <div className="bg-red-600 text-white text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-2.5">
        <ShieldAlert size={16} className="flex-shrink-0" />
        <p>
          <span className="font-bold">Your account is suspended.</span>{' '}
          You can still browse, but posting tasks, making offers, and broadcasting are
          disabled. Contact{' '}
          <a href="mailto:supportfoster@gmail.com" className="underline font-semibold">
            supportfoster@gmail.com
          </a>{' '}
          if you think this is a mistake.
        </p>
      </div>
    </div>
  );
};
