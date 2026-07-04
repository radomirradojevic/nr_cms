import { renderWebshopDashboardPath } from "../../_delegate";

export default async function WebshopCategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return renderWebshopDashboardPath(["categories", id]);
}
