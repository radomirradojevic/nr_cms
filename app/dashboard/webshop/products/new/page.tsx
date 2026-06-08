import { renderWebshopDashboardPath } from "../../_delegate";

export default async function NewWebshopProductPage() {
  return renderWebshopDashboardPath(["products", "new"]);
}
