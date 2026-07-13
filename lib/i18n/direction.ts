import type { TextDirection } from "@/lib/i18n/types";

export type LogicalBackIconName = "ArrowLeft" | "ArrowRight";
export type InlineEndToastPosition = "bottom-left" | "bottom-right";

export function getLogicalBackIconName(
  direction: TextDirection,
): LogicalBackIconName {
  return direction === "rtl" ? "ArrowRight" : "ArrowLeft";
}

export function getInlineEndToastPosition(
  direction: TextDirection,
): InlineEndToastPosition {
  return direction === "rtl" ? "bottom-left" : "bottom-right";
}
