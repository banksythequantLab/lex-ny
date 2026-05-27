/**
 * Supabase auth + database client helpers.
 *
 * Magic-link auth: user enters email → gets email with login link → click → logged in.
 * No passwords, no auth state to manage on our end beyond a session cookie.
 *
 * Setup:
 *   1. Create Supabase project at supabase.com (~3 min)
 *   2. Project Settings → API → copy the URL and anon key
 *   3. Project Settings → Authentication → Email Templates → customize the magic-link email
 *   4. Add the URL + anon key to .env.local in each app:
 *        NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *        NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
 *        SUPABASE_SERVICE_ROLE_KEY=ey...  (server-side only — never expose)
 *   5. Run the migrations in supabase/migrations/ to create our tables
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { User } from "./types.js";

function getEnv(name: string, required = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value || "";
}

/**
 * Browser-side Supabase client. Uses the public anon key. Safe to ship to client.
 * Honors RLS policies — users can only read their own data.
 */
export function getBrowserClient(): SupabaseClient {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

/**
 * Server-side Supabase client with full DB access (service role key).
 * NEVER expose this to the browser. Only use in API routes / server actions.
 * Bypasses RLS — use carefully.
 */
export function getServiceClient(): SupabaseClient {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

/**
 * Send a magic-link login email.
 *
 * @param email — the user's email address
 * @param redirectTo — full URL to redirect to after the user clicks the link
 * @returns success/failure
 */
export async function sendMagicLink(
  email: string,
  redirectTo: string
): Promise<{ ok: boolean; error?: string }> {
  const client = getBrowserClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      // Don't create new accounts silently — user must explicitly sign up
      // (we'll relax this for the hackathon since we want zero friction)
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Get the current logged-in user from a request's session cookie.
 * Returns null if not logged in.
 *
 * For Next.js App Router, use this inside server components / route handlers
 * after reading the supabase auth cookie.
 */
export async function getCurrentUser(
  accessToken: string
): Promise<User | null> {
  const service = getServiceClient();
  const { data: { user: authUser }, error } = await service.auth.getUser(accessToken);

  if (error || !authUser) return null;

  // Look up our extended user record (role, name, etc.) from the users table
  const { data: userRow, error: userErr } = await service
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (userErr || !userRow) {
    // First login — create the user row with default role
    const newUser = {
      id: authUser.id,
      email: authUser.email!,
      full_name: authUser.user_metadata?.full_name || null,
      role: "customer" as const,
      created_at: new Date().toISOString(),
    };
    await service.from("users").insert(newUser);
    return newUser;
  }

  return userRow as User;
}

/**
 * Check if a user has the attorney/admin role — used to gate the /admin
 * review queue route in both apps.
 */
export function isStaff(user: User | null): boolean {
  return user?.role === "attorney" || user?.role === "admin";
}
