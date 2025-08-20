import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { categories, items } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
	const client = neon(process.env.DATABASE_URL!);
	const db = drizzle(client);

	// localizar ids das duas variantes
	const cats = await db.select().from(categories);
	const canonical = cats.find(c => c.name === "MEMÓRIA RAM");
	const duplicate = cats.find(c => c.name === "MEMORIA RAM");
	if (!canonical || !duplicate) {
		console.log("Nada a fazer. canonical=", !!canonical, "duplicate=", !!duplicate);
		return;
	}
	console.log("Canonical:", canonical.id, canonical.name);
	console.log("Duplicate:", duplicate.id, duplicate.name);

	// mover itens para a canonical
	const moved = await db.update(items)
		.set({ categoryId: canonical.id, updatedAt: sql`now()` })
		.where(eq(items.categoryId, duplicate.id))
		.returning({ id: items.id });
	console.log(`Itens atualizados: ${moved.length}`);

	// apagar categoria duplicada
	await db.delete(categories).where(eq(categories.id, duplicate.id));
	console.log("Categoria duplicada removida.");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
}); 