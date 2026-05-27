import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function WizardHubPage() {
  return (
    <>
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto px-7 py-2.5 flex justify-between">
          <span>Pick a work type</span>
          <span>Copyright in a Box · USCO filing</span>
        </div>
      </div>
      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto px-7 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px]">
            <span className="seal-badge">©</span> Nota.Lawyer
          </Link>
        </div>
      </nav>

      <section className="py-16">
        <div className="max-w-[1180px] mx-auto px-7">
          <span className="editorial-eyebrow">Start a registration</span>
          <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-tight font-medium mt-3 mb-2">
            What are you registering?
          </h1>
          <p className="text-lg text-[var(--color-ink-2)] mb-12 max-w-2xl">
            Each kind of work files under a different USCO form. The fee is the same — $45 to the government, $0 to us.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-2xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 border-2 border-[var(--color-ink)] grid place-items-center font-[family-name:var(--font-display)] font-semibold text-2xl mb-3">◭</div>
                <CardTitle>Visual art</CardTitle>
                <CardDescription>Form VA · logos, designs, illustrations, packaging artwork</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/wizard/visual-art">Start →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 border-2 border-[var(--color-ink)] grid place-items-center font-[family-name:var(--font-display)] font-semibold text-2xl mb-3">⬚</div>
                <CardTitle>Photographs</CardTitle>
                <CardDescription>Form VA · single image, or GRPPH group of up to 750</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/wizard/photographs">Start →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 border-2 border-[var(--color-ink)] grid place-items-center font-[family-name:var(--font-display)] font-semibold text-2xl mb-3">¶</div>
                <CardTitle>Literary works</CardTitle>
                <CardDescription>Form TX · novels, screenplays, code, poetry, blog archives</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/wizard/literary">Start →</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
