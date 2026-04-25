import { db } from '@/db';
import { links } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getLinksByUserId(userId: string) {
  return db.select().from(links).where(eq(links.userId, userId));
}
