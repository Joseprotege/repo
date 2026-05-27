import { supabase } from '../lib/supabase';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export type UploadBucket = 'avatars' | 'listing-photos';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

/**
 * Upload a single file to a Supabase Storage bucket.
 * Path layout: `<userId>/<filename>` — required by the per-user RLS policy.
 */
export async function uploadImage(
  bucket: UploadBucket,
  userId: string,
  file: File,
  opts?: { subfolder?: string },
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Use JPEG, PNG, WebP, or GIF.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeName = `${crypto.randomUUID()}.${ext}`;
  const path = opts?.subfolder
    ? `${userId}/${opts.subfolder}/${safeName}`
    : `${userId}/${safeName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Delete an uploaded image by its storage path. Silently ignores RLS denials. */
export async function deleteImage(bucket: UploadBucket, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.warn('[storage] delete failed:', error.message);
}

/**
 * Given a public URL like `https://xxx.supabase.co/storage/v1/object/public/<bucket>/<path>`,
 * extract the path portion so it can be deleted later. Returns null if the URL
 * doesn't look like one of our storage URLs.
 */
export function pathFromPublicUrl(bucket: UploadBucket, url: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}
