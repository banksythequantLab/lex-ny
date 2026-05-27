import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const { data: userRow } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userRow || (userRow.role !== "attorney" && userRow.role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Not authorized</CardTitle>
            <CardDescription>
              This page is for attorneys and admins. If you should have access, contact build@nota.lawyer.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Pull all Counsel-tier filings awaiting review
  const { data: pending } = await supabase
    .from("filings")
    .select("*, users(email, full_name)")
    .eq("tier", "counsel")
    .in("status", ["pending_review", "reviewed"])
    .order("created_at", { ascending: true });

  return (
    <>
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto px-7 py-2.5 flex justify-between">
          <span>Attorney review queue · {userRow.email}</span>
          <span>{pending?.length ?? 0} pending</span>
        </div>
      </div>
      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto px-7 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px]">
            <span className="seal-badge">™</span> Nota.Lawyer
          </Link>
        </div>
      </nav>

      <section className="py-12">
        <div className="max-w-[1180px] mx-auto px-7">
          <span className="editorial-eyebrow">Attorney review queue</span>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight font-medium mt-2 mb-2">
            Pending Counsel-tier reviews
          </h1>
          <p className="text-[var(--color-ink-2)] mb-8">
            Filings where the customer paid for attorney review. Click to open.
          </p>

          {!pending || pending.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <p className="text-[var(--color-ink-2)]">No pending reviews.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pending.map((f) => {
                const wizardData = f.wizard_data as { mark?: string; classes?: number[] };
                const userInfo = (f.users as unknown) as { email: string; full_name: string | null } | null;
                return (
                  <Card key={f.id}>
                    <CardContent className="flex justify-between items-center py-5">
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] font-semibold text-xl">
                          {wizardData.mark || "Untitled"}
                        </h3>
                        <p className="font-[family-name:var(--font-mono)] text-xs tracking-wider text-[var(--color-ink-2)] mt-1 uppercase">
                          {f.status.replace(/_/g, " ")}
                          {wizardData.classes && ` · Class ${wizardData.classes.join(", ")}`}
                          {userInfo && ` · ${userInfo.email}`}
                        </p>
                      </div>
                      <Link
                        href={`/admin/${f.id}`}
                        className="text-sm text-[var(--color-seal)] hover:underline"
                      >
                        Open review →
                      </Link>
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
