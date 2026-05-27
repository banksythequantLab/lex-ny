import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: filings } = await supabase
    .from("filings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto px-7 py-2.5 flex justify-between">
          <span>Dashboard · {user.email}</span>
          <span>{filings?.length ?? 0} filings</span>
        </div>
      </div>
      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto px-7 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px]">
            <span className="seal-badge">™</span> Nota.Lawyer
          </Link>
          <Button asChild>
            <Link href="/wizard">+ New trademark filing</Link>
          </Button>
        </div>
      </nav>

      <section className="py-12">
        <div className="max-w-[1180px] mx-auto px-7">
          <span className="editorial-eyebrow">My filings</span>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight font-medium mt-2 mb-8">
            Your trademark filings
          </h1>

          {!filings || filings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <p className="text-[var(--color-ink-2)] mb-6">No filings yet.</p>
                <Button asChild>
                  <Link href="/wizard">Start your first trademark filing →</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filings.map((f) => {
                const wizardData = f.wizard_data as { mark?: string; classes?: number[] };
                return (
                  <Card key={f.id}>
                    <CardContent className="flex justify-between items-center py-6">
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] font-semibold text-xl">
                          {wizardData.mark || "Untitled filing"}
                        </h3>
                        <p className="font-[family-name:var(--font-mono)] text-xs tracking-wider text-[var(--color-ink-2)] mt-1 uppercase">
                          {f.status.replace(/_/g, " ")} · {f.tier} tier
                          {wizardData.classes && ` · Class ${wizardData.classes.join(", ")}`}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/wizard?filing_id=${f.id}`}>Open →</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
