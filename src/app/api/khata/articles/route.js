import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { articleCostRows } from "@/lib/khata";
import { articleStitchCosts } from "@/constants/wages";

/**
 * GET /api/khata/articles — admin only. What one piece of each article costs to stitch, from the work entered: each
 * operation's rate (paid per piece) and their sum (see articleStitchCosts).
 */
export const GET = route(async () => {
  const db = await getDb();
  return ok(articleStitchCosts(await articleCostRows(db)));
});
