import { renderLicenseServerDashboardPath } from "../_delegate";

export default async function LicenseServerPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ licenseServerPath?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { licenseServerPath = [] } = await params;
  return renderLicenseServerDashboardPath(
    licenseServerPath,
    await searchParams,
  );
}
