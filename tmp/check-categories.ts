import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { categories } from "../shared/schema";
import { asc } from "drizzle-orm";

async function main() {
	if (!process.env.DATABASE_URL) {
		console.error("DATABASE_URL não definido");
		process.exit(1);
	}
	const client = neon(process.env.DATABASE_URL);
	const db = drizzle(client);
	const rows = await db.select().from(categories).orderBy(asc(categories.name));
	console.log("count=", rows.length);
	console.log(rows.map(r => `${r.name} (${r.id})`).join("\n"));
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
}); 