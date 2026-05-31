import { redirect } from "next/navigation";

export default function LegacyTopMenuPage() {
  redirect("/dashboard/menus");
}
