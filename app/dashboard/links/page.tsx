import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LinksTableContainer } from "@/app/dashboard/links-table-container";

export default async function LinksPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return <LinksTableContainer />;
}
