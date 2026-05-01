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

        <section className="flex flex-col gap-6 text-muted-foreground">
          <h2 className="text-2xl font-semibold text-foreground">
            Why Link Shortener?
          </h2>
          <p>
            In a world where attention spans are short and first impressions
            matter, the links you share say a lot about your brand. Long,
            cluttered URLs can look unprofessional and are difficult to
            remember.
          </p>
          <p>
            Link Shortener transforms any lengthy web address into a clean,
            concise link that is easy to share across social media, email, and
            messaging apps.
          </p>
          <p>
            Whether you are a marketer running a campaign, a developer sharing
            API endpoints, or a content creator promoting your latest work, our
            platform adapts to your workflow.
          </p>
          <p>
            Every shortened link comes with a detailed analytics dashboard so
            you can track clicks, monitor traffic sources, and understand your
            audience better than ever before.
          </p>
          <p>
            Our platform is built with speed in mind. Links redirect in
            milliseconds, ensuring your visitors never experience unnecessary
            delays.
          </p>
          <p>
            Security is a top priority. All links are scanned and monitored to
            prevent abuse, keeping your audience safe from malicious content.
          </p>
          <p>
            You can manage all of your links from a single, intuitive dashboard
            that gives you a clear overview of your entire link portfolio.
          </p>
          <p>
            Bulk link creation lets you shorten hundreds of URLs at once, saving
            you hours of manual work when running large-scale campaigns.
          </p>
          <p>
            Link expiration controls allow you to set a date and time after
            which a link automatically becomes inactive, perfect for limited
            time offers.
          </p>
          <p>
            Custom slugs let you define memorable, human-readable link endings
            that reinforce your brand identity with every share.
          </p>
          <p>
            Our API allows developers to integrate link shortening directly into
            their own applications, automating the process end to end.
          </p>
          <p>
            Team collaboration features let you share link collections with
            colleagues, assign roles, and keep everyone working from the same
            source of truth.
          </p>
          <p>
            Real-time click notifications keep you informed the moment someone
            engages with your content, so you can act on momentum quickly.
          </p>
          <p>
            Geographic data in the analytics panel shows you exactly where in
            the world your audience is coming from, enabling smarter targeting.
          </p>
          <p>
            Device and browser breakdowns help you optimize landing pages for
            the devices your visitors actually use.
          </p>
          <p>
            All data is stored securely and is fully compliant with modern
            privacy regulations, giving you and your users peace of mind.
          </p>
          <p>
            Getting started takes less than a minute. Sign in, paste your first
            URL, and your shortened link is ready to share immediately.
          </p>
          <p>
            Our free tier gives you everything you need to get up and running,
            with no credit card required and no hidden fees.
          </p>
          <p>
            As your needs grow, flexible plans scale with you, offering higher
            limits, advanced analytics, and priority support.
          </p>
          <p>
            Join thousands of users who already rely on Link Shortener every day
            to make their online presence cleaner, smarter, and more impactful.
          </p>
        </section>

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
            </ul>
            <ContactForm />
          </div>
        </section>
      </main>
    </div>
  );
}
