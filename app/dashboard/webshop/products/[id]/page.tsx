import { renderWebshopDashboardPath } from "../../_delegate";

export default async function WebshopProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return renderWebshopDashboardPath(["products", id], query);
}
