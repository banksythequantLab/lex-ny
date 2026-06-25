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
import { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "./types.js";
/**
 * Browser-side Supabase client. Uses the public anon key. Safe to ship to client.
 * Honors RLS policies — users can only read their own data.
 */
export declare function getBrowserClient(): SupabaseClient;
/**
 * Server-side Supabase client with full DB access (service role key).
 * NEVER expose this to the browser. Only use in API routes / server actions.
 * Bypasses RLS — use carefully.
 */
export declare function getServiceClient(): SupabaseClient;
/**
 * Send a magic-link login email.
 *
 * @param email — the user's email address
 * @param redirectTo — full URL to redirect to after the user clicks the link
 * @returns success/failure
 */
export declare function sendMagicLink(email: string, redirectTo: string): Promise<{
    ok: boolean;
    error?: string;
}>;
/**
 * Get the current logged-in user from a request's session cookie.
 * Returns null if not logged in.
 *
 * For Next.js App Router, use this inside server components / route handlers
 * after reading the supabase auth cookie.
 */
export declare function getCurrentUser(accessToken: string): Promise<User | null>;
/**
 * Check if a user has the attorney/admin role — used to gate the /admin
 * review queue route in both apps.
 */
export declare function isStaff(user: User | null): boolean;
//# sourceMappingURL=auth.d.ts.map