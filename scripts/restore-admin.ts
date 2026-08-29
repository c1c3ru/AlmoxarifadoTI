import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

dotenv.config();

function generateRandomPassword(): string {
    // 18 bytes -> 24 caracteres base64url, sem caracteres ambíguos de padding
    return randomBytes(18).toString("base64url");
}

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

        // Gera uma senha aleatória forte a cada execução — nunca hardcoded.
        // Ela só existe neste console output; não é persistida em texto puro em nenhum lugar.
        const generatedPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        const result = await sql(`
      INSERT INTO "users" (username, password, name, email, matricula, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email, role
    `, [
            'admin',
            hashedPassword,
            'Administrador',
            'admin@almoxarifado.local',
            '2329311',
            'admin',
            true
        ]);

        console.log("\n✅ Usuário administrador criado com sucesso!");
        console.log("📋 Detalhes (a senha abaixo só aparece agora — anote-a):");
        console.log(`   Username: admin`);
        console.log(`   Password: ${generatedPassword}`);
        console.log(`   Email: admin@almoxarifado.local`);
        console.log(`   Matrícula: 2329311`);
        console.log(`   Role: admin`);
        console.log(`\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!`);

    } catch (error: any) {
        console.error("❌ Erro ao restaurar usuário:", error.message);
        process.exit(1);
    }
}

restoreAdminUser();
