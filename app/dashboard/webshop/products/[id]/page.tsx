import { renderWebshopDashboardPath } from "../../_delegate";

export default async function WebshopProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return renderWebshopDashboardPath(["products", id]);
}
