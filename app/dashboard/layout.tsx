import { redirect } from "next/navigation";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="dashboard-content-root flex flex-col flex-1">
      {children}
      <Toaster richColors closeButton position="bottom-right" duration={3500} />
    </div>
  );
}
