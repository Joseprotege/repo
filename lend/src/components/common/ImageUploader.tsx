import React, { useState, useRef } from 'react';
import { Upload, X, ImagePlus, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SUPABASE_CONFIGURED } from '../../lib/supabase';
import { uploadImage, deleteImage, pathFromPublicUrl } from '../../services/storage';
import type { UploadBucket } from '../../services/storage';

interface Props {
  bucket: UploadBucket;
  /** Currently-attached image URLs (controlled). */
  value: string[];
  onChange: (urls: string[]) => void;
  /** Max number of images. */
  max?: number;
  /** Optional subfolder within the user's storage prefix (e.g. listingId). */
  subfolder?: string;
  /** Render variant — square grid (listing photos) vs single circle (avatar). */
  variant?: 'grid' | 'avatar';
  className?: string;
}

export const ImageUploader: React.FC<Props> = ({
  bucket,
  value,
  onChange,
  max = 6,
  subfolder,
  variant = 'grid',
  className = '',
}) => {
  const { user } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUpload = SUPABASE_CONFIGURED && !!user;
  const remaining = Math.max(0, max - value.length);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!user) {
      setError('You must be signed in to upload images.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const toUpload = Array.from(files).slice(0, remaining);
      const results = await Promise.all(
        toUpload.map(f => uploadImage(bucket, user.id, f, { subfolder })),
      );
      onChange([...value, ...results.map(r => r.publicUrl)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleRemove = async (url: string) => {
    onChange(value.filter(u => u !== url));
    const path = pathFromPublicUrl(bucket, url);
    if (path) deleteImage(bucket, path);
  };

  if (!canUpload) {
    return (
      <div className={`bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center text-sm text-slate-500 ${className}`}>
        Sign in to upload photos.
      </div>
    );
  }

  // ── Avatar variant ── single circular image with overlay button ─────────────
  if (variant === 'avatar') {
    const current = value[0];
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
            {current
              ? <img src={current} alt="" className="w-full h-full object-cover" />
              : <ImagePlus size={28} className="text-slate-400" />}
          </div>
          {current && (
            <button
              type="button"
              onClick={() => handleRemove(current)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
              aria-label="Remove photo"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {current ? 'Change photo' : 'Upload photo'}
          </button>
          <p className="text-xs text-slate-400 mt-0.5">JPEG, PNG, WebP up to 5 MB</p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  // ── Grid variant (listing photos) ──
  return (
    <div className={className}>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {value.map(url => (
          <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(url)}
              className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove photo"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-400
              text-slate-400 hover:text-teal-500 flex flex-col items-center justify-center text-xs
              transition-colors disabled:opacity-50"
          >
            {uploading
              ? <Loader2 size={20} className="animate-spin" />
              : <><ImagePlus size={20} /><span className="mt-1">Add photo</span></>}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-2">
        {value.length}/{max} photos · JPEG, PNG, WebP up to 5 MB each
      </p>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
};
