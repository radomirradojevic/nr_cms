import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/contact-form";

export default function Home() {
  return (
    <div className="flex flex-1 justify-center px-6 py-16">
      <main className="flex w-full max-w-5xl flex-col gap-16">
        <section className="flex flex-col items-center gap-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Share shorter links that are easier to remember.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Link Shortener helps you create clean, branded links and keep track
            of how they perform, all from one simple dashboard.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Instant short links</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Turn long URLs into short, shareable links in seconds.
            </p>
          </article>
          <article className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Performance insights</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Monitor engagement and understand how each link performs.
            </p>
          </article>
          <article className="rounded-lg border bg-card p-6 sm:col-span-2 lg:col-span-1">
            <h2 className="text-lg font-semibold">Easy dashboard</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage all your links from one clean and focused interface.
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

        <section className="rounded-lg border bg-card p-8">
          <h2 className="text-2xl font-semibold">Contact us</h2>
          <div className="mt-6 grid gap-10 sm:grid-cols-2">
            <ul className="space-y-2 text-muted-foreground">
              <li>📍 123 Main Street, Suite 400, San Francisco, CA 94105</li>
              <li>
                📧{" "}
                <a
                  href="mailto:hello@linkshortener.io"
                  className="underline hover:text-foreground"
                >
                  hello@linkshortener.io
                </a>
              </li>
              <li>
                📞{" "}
                <a
                  href="tel:+14155550199"
                  className="underline hover:text-foreground"
                >
                  +1 (415) 555-0199
                </a>
              </li>
            </ul>
            <ContactForm />
          </div>
        </section>
      </main>
    </div>
  );
}
