import { renderWebshopDashboardPath } from "../_delegate";

export default async function WebshopDashboardPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ webshopPath?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ webshopPath = [] }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  return renderWebshopDashboardPath(webshopPath, query);
}
