import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      <h1 className="text-2xl font-semibold">
        This is Night Raven CMS admin dashboard
      </h1>
      <div
        style={{
          width: 400,
          height: 400,
          borderRadius: "50%",
          boxShadow:
            "0 0 0 4px #349aee, 0 0 32px 12px #349aee88, 0 0 64px 24px #349aee33",
        }}
        className="mt-6"
      >
        <Image
          src="/nr/images/logo/big/NR_Logo.png"
          alt="Night Raven Logo"
          width={400}
          height={400}
          style={{ borderRadius: "50%" }}
          priority
        />
      </div>
    </div>
  );
}
