import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getRoles } from "@/lib/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  const roles = getRoles(user.publicMetadata);
  if (roles.length === 0 || (roles.length === 1 && roles[0] === "viewer")) {
    redirect("/");
  }

  return <div className="flex flex-col flex-1">{children}</div>;
}
