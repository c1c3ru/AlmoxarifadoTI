import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function restoreAdminUser() {
    console.log("🔧 Restaurando usuário administrador...\n");

    try {
        // Verificar se já existe algum usuário
        const existingUsers = await sql(`SELECT COUNT(*) as count FROM "users"`);

        if (Number(existingUsers[0].count) > 0) {
            console.log("✅ Já existem usuários no banco. Nenhuma ação necessária.");
            return;
        }

        console.log("⚠️  Nenhum usuário encontrado. Criando usuário admin padrão...");

        // Criar usuário admin padrão
        const hashedPassword = await bcrypt.hash("admin123", 10);

        const result = await sql(`
      INSERT INTO "users" (username, password, name, email, matricula, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email, role
    `, [
            'admin',
            hashedPassword,
            'Administrador',
            'admin@almoxarifado.local',
            '000000',
            'admin',
            true
        ]);

        console.log("\n✅ Usuário administrador criado com sucesso!");
        console.log("📋 Detalhes:");
        console.log(`   Username: admin`);
        console.log(`   Password: admin123`);
        console.log(`   Email: admin@almoxarifado.local`);
        console.log(`   Matrícula: 000000`);
        console.log(`   Role: admin`);
        console.log(`\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!`);

    } catch (error: any) {
        console.error("❌ Erro ao restaurar usuário:", error.message);
        process.exit(1);
    }
}

restoreAdminUser();
