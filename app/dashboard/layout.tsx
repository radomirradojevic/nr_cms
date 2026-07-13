import { redirect } from "next/navigation";
import { I18nProvider } from "@/components/i18n-provider";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getI18nSettings, loadMessages } from "@/lib/i18n/server";
import { getInlineEndToastPosition } from "@/lib/i18n/direction";
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

  const { backendDirection, backendLanguage } = await getI18nSettings();
  const messages = await loadMessages(backendLanguage);

  return (
    <I18nProvider
      language={backendLanguage}
      direction={backendDirection}
      messages={messages}
    >
      <div
        dir={backendDirection}
        className="dashboard-content-root flex flex-1 flex-col"
      >
        {children}
        <Toaster
          richColors
          closeButton
          position={getInlineEndToastPosition(backendDirection)}
          duration={3500}
        />
      </div>
    </I18nProvider>
  );
}
