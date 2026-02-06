import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function cleanupOrphans() {
    console.log("🧹 Limpando registros órfãos de user_activity...");

    try {
        const result = await sql`
      DELETE FROM user_activity 
      WHERE user_id NOT IN (SELECT id FROM users)
      RETURNING user_id
    `;

        console.log(`✅ ${result.length} registros órfãos removidos`);

        if (result.length > 0) {
            console.log("IDs removidos:", result.map(r => r.user_id).join(", "));
        }

        // Verificar se ainda há registros
        const remaining = await sql`SELECT COUNT(*) as count FROM user_activity`;
        console.log(`📊 Registros restantes em user_activity: ${remaining[0].count}`);

    } catch (error) {
        console.error("❌ Erro ao limpar órfãos:", error);
        process.exit(1);
    }
}

cleanupOrphans();
