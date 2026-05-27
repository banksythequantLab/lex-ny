"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    if (!email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="flex items-center gap-3 font-[family-name:var(--font-display)] font-semibold text-2xl mb-4">
            <span className="seal-badge">™</span> Nota.Lawyer
          </Link>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Magic link login. No passwords. Enter your email, click the link in the email we send you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sent ? (
            <>
              <div>
                <label className="editorial-label">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  onKeyDown={(e) => e.key === "Enter" && sendLink()}
                />
              </div>
              {error && (
                <div className="bg-[var(--color-seal)]/10 border border-[var(--color-seal)] text-[var(--color-seal-deep)] p-3 text-sm">
                  {error}
                </div>
              )}
              <Button onClick={sendLink} disabled={loading} className="w-full">
                {loading ? "Sending..." : "Send magic link →"}
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <h3 className="font-[family-name:var(--font-display)] text-xl mb-2">Check your inbox</h3>
              <p className="text-sm text-[var(--color-ink-2)]">
                We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-4">
                Didn't receive it? Check spam, or{" "}
                <button onClick={() => setSent(false)} className="text-[var(--color-seal)] underline">
                  try again
                </button>
                .
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
