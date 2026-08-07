import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service_role key — never expose this
// key or this client to the browser. Used for private file storage (progress
// photos, invoice PDFs, expense receipts), all gated behind server actions
// that already enforce gym/role scoping before any storage call happens.
//
// The client is created lazily, on first use, rather than at module load:
// NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are optional while the
// feature isn't configured, and an eager createClient() at import time throws
// "supabaseUrl is required" and breaks `next build`. With lazy init, importing
// this module is always safe; only an actual upload/download throws — with a
// clear message pointing at the env vars.
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in .env (see SETUP.md → Supabase Storage).",
    );
  }
  supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
  return supabaseAdmin;
}

export const STORAGE_BUCKET = "kailon";

/** Uploads a file and returns the storage path (not a public URL — files are
 *  private; use `getSignedUrl` to hand out a time-boxed viewing link). */
export async function uploadFile(path: string, file: File | Buffer, contentType: string) {
  const body = Buffer.isBuffer(file) ? file : Buffer.from(await (file as File).arrayBuffer());
  const { error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function getSignedUrl(path: string, expiresInSeconds = 3600) {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

export async function deleteFile(path: string) {
  await getSupabaseAdmin().storage.from(STORAGE_BUCKET).remove([path]);
}
