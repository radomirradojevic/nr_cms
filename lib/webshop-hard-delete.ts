export const WEBSHOP_HARD_DELETE_CONFIRMATION = "DELETE WEBSHOP AND ALL DATA";

export function isWebshopHardDeleteConfirmed(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.trim() === WEBSHOP_HARD_DELETE_CONFIRMATION
  );
}
