import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function checkDatabase() {
    console.log("🔍 Verificando estado do banco de dados...\n");

    try {
        // Verificar todas as tabelas
        const tables = ['users', 'categories', 'items', 'movements', 'password_resets', 'user_activity'];

        for (const table of tables) {
            try {
                const countResult = await sql(`SELECT COUNT(*) as count FROM "${table}"`);
                const count = Number(countResult[0].count);
                console.log(`📊 ${table}: ${count} registros`);

                if (table === 'users' && count > 0) {
                    // Não seleciona email/password aqui: script de diagnóstico não deve
                    // imprimir PII no console.
                    const sample = await sql(`SELECT id, username, role, is_active FROM "${table}" LIMIT 3`);
                    console.log(`   Amostra:`, sample);
                }
            } catch (error: any) {
                console.log(`❌ ${table}: ${error.message}`);
            }
        }

    } catch (error) {
        console.error("❌ Erro:", error);
    }
}

checkDatabase();
