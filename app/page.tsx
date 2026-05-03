import { SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 justify-center px-6 py-16">
      <main className="flex w-full max-w-5xl flex-col gap-16">
        <section className="flex flex-col items-center gap-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Content management, distilled to its essence.
          </h1>
          <div
            style={{
              width: 400,
              height: 400,
              borderRadius: "50%",
              boxShadow:
                "0 0 0 4px #349aee, 0 0 32px 12px #349aee88, 0 0 64px 24px #349aee33",
            }}
          >
            <Image
              src="/nr/images/logo/big/NR_Logo.png"
              alt="Night Raven CMS Logo"
              width={400}
              height={400}
              style={{ borderRadius: "50%" }}
              priority
            />
          </div>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Night Raven CMS is built on the belief that power and simplicity are
            not opposites. Every feature earns its place — nothing more, nothing
            less.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Minimal by design</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No bloat, no noise. A focused interface that gets out of your way
              and lets you manage content with precision.
            </p>
          </article>
          <article className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Role-based access</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fine-grained permissions ensure every team member sees exactly
              what they need — and nothing they should not.
            </p>
          </article>
          <article className="rounded-lg border bg-card p-6 sm:col-span-2 lg:col-span-1">
            <h2 className="text-lg font-semibold">Developer-first</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Built on modern tooling from the ground up — fast, type-safe, and
              ready to extend without fighting the framework.
            </p>
          </article>
        </section>

        <div className="flex justify-center">
          <SignInButton mode="modal">
            <Button variant="secondary" size="lg" className="cursor-pointer">
              Get started
            </Button>
          </SignInButton>
        </div>

        <section className="flex flex-col gap-6 text-muted-foreground">
          <h2 className="text-2xl font-semibold text-foreground">
            Why Night Raven CMS?
          </h2>
          <p>
            Most content management systems start simple and grow complicated.
            Menus multiply, settings sprawl, and what was once a clean interface
            becomes a maze. Night Raven CMS takes the opposite path.
          </p>
          <p>
            Every decision in its architecture was made with restraint. If a
            feature does not earn its weight in genuine usefulness, it does not
            ship. The result is a system that feels immediately familiar yet
            surprisingly capable.
          </p>
          <p>
            Teams of any size can adopt it without lengthy onboarding. Editors
            open the dashboard and understand it intuitively. Developers extend
            it without reading pages of documentation first.
          </p>
          <p>
            Access control is woven into the foundation rather than bolted on
            afterwards. Roles and permissions are expressive enough to model
            real organisations while remaining easy to reason about.
          </p>
          <p>
            Because the codebase stays lean, performance is not a goal to
            optimise toward — it is simply the natural state. Pages load fast,
            actions respond instantly, and the experience never drags.
          </p>
          <p>
            Night Raven CMS is proof that thoughtful constraints produce better
            software. When you remove everything that does not belong, what
            remains is exactly what you need.
          </p>
        </section>
      </main>
    </div>
  );
}
