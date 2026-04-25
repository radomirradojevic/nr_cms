import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLinksByUserId } from "@/data/links";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const links = await getLinksByUserId(userId);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Your Links</h1>
      {links.length === 0 ? (
        <p className="text-muted-foreground">You have no links yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Short Code</TableHead>
              <TableHead>Original URL</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => (
              <TableRow key={link.id}>
                <TableCell className="font-mono">{link.shortCode}</TableCell>
                <TableCell className="max-w-xs truncate">{link.originalUrl}</TableCell>
                <TableCell>{link.createdAt.toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
