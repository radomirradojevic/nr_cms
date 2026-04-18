import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-8 px-6 py-32 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Shorten your links, instantly.
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Create short, memorable links and track their performance. Sign in to
          get started.
        </p>
        <div className="flex gap-4">
          <SignInButton mode="modal">
            <Button size="lg" className="cursor-pointer">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button variant="outline" size="lg" className="cursor-pointer">Sign up</Button>
          </SignUpButton>
        </div>
      </main>
    </div>
  );
}
