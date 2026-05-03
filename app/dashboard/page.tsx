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
      <Image
        src="/nr/images/logo/big/NR_Logo.png"
        alt="Night Raven Logo"
        width={600}
        height={600}
        className="mt-6"
      />
    </div>
  );
}
