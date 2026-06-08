import { renderWebshopDashboardPath } from "../_delegate";

export default async function WebshopProductsPage() {
  return renderWebshopDashboardPath(["products"]);
}
