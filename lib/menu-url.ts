export const MENU_URL_VALIDATION_MESSAGE =
  "Must be # or start with http(s):// or /";
export const MENU_URL_SERVER_VALIDATION_MESSAGE =
  "URL must be # or start with http(s):// or /";

export function isValidMenuUrl(value: string) {
  const url = value.trim();
  return url === "#" || /^https?:\/\//i.test(url) || url.startsWith("/");
}
