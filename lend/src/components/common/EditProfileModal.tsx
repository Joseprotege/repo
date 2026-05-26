import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import type { User } from '../../types';
import { ImageUploader } from './ImageUploader';
import { updateProfile } from '../../services/profiles';
import { SUPABASE_CONFIGURED } from '../../lib/supabase';

interface Props {
  user: User;
  onClose: () => void;
  onSaved: (updates: Partial<User>) => void;
}

export const EditProfileModal: React.FC<Props> = ({ user, onClose, onSaved }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [skillsInput, setSkillsInput] = useState(user.skills.join(', '));
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const skills = skillsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 12);

    const localUpdates: Partial<User> = {
      displayName: displayName.trim() || user.displayName,
      bio: bio.trim(),
      skills,
      avatarUrl,
    };

    if (SUPABASE_CONFIGURED) {
      const ok = await updateProfile(user.id, {
        display_name: localUpdates.displayName,
        bio: localUpdates.bio,
        skills,
        // avatar_url is a new column added in migration 006
        ...(avatarUrl && !avatarUrl.includes('dicebear.com')
          ? { avatar_url: avatarUrl } as Record<string, unknown>
          : {}),
      } as Parameters<typeof updateProfile>[1]);
      if (!ok) {
        setSaving(false);
        setError('Could not save changes. Try again.');
        return;
      }
    }

    onSaved(localUpdates);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Edit your profile</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Photo</label>
            <ImageUploader
              bucket="avatars"
              variant="avatar"
              value={avatarUrl && !avatarUrl.includes('dicebear.com') ? [avatarUrl] : []}
              onChange={urls => setAvatarUrl(urls[0] ?? '')}
              max={1}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="A line or two about you — what you're good at, what you like helping with."
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl resize-none
                focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-slate-400 mt-1">{bio.length}/300</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Skills <span className="text-slate-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={e => setSkillsInput(e.target.value)}
              placeholder="plumbing, dog walking, tutoring"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700
                disabled:opacity-60 text-white text-sm font-semibold rounded-xl"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
