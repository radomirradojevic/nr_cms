import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getRoles } from "@/lib/roles";
import { Toaster } from "@/components/ui/sonner";

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

  return (
    <div className="dashboard-content-root flex flex-col flex-1">
      {children}
      <Toaster richColors closeButton position="bottom-right" duration={3500} />
    </div>
  );
}
