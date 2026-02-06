import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "fs";
import { mkdirSync } from "fs";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
        new Date().toTimeString().split(' ')[0].replace(/:/g, '');

    console.log(`📦 Criando backup do banco de dados...`);
    console.log(`⏰ Timestamp: ${timestamp}`);

    try {
        // Criar diretório de backups
        mkdirSync('backups', { recursive: true });

        const backup: any = {
            timestamp: new Date().toISOString(),
            database: 'AlmoxarifadoTI',
            tables: {}
        };

        // Backup de todas as tabelas
        const tables = ['users', 'categories', 'items', 'movements', 'password_resets', 'user_activity'];

        for (const table of tables) {
            console.log(`  📋 Exportando tabela: ${table}...`);
            try {
                const data = await sql(`SELECT * FROM ${table}`);
                backup.tables[table] = {
                    count: data.length,
                    data: data
                };
                console.log(`    ✅ ${data.length} registros exportados`);
            } catch (error: any) {
                console.log(`    ⚠️  Tabela ${table} não encontrada ou vazia`);
                backup.tables[table] = {
                    count: 0,
                    data: [],
                    error: error.message
                };
            }
        }

        // Salvar backup em JSON
        const filename = `backups/backup_${timestamp}.json`;
        writeFileSync(filename, JSON.stringify(backup, null, 2));

        console.log(`\n✅ Backup criado com sucesso!`);
        console.log(`📁 Arquivo: ${filename}`);

        // Estatísticas
        console.log(`\n📊 Estatísticas do Backup:`);
        let totalRecords = 0;
        for (const [table, info] of Object.entries(backup.tables)) {
            const count = (info as any).count;
            totalRecords += count;
            console.log(`  - ${table}: ${count} registros`);
        }
        console.log(`  📈 Total: ${totalRecords} registros`);

        // Criar também um SQL dump simplificado
        console.log(`\n📝 Criando SQL dump...`);
        let sqlDump = `-- Backup do banco AlmoxarifadoTI\n`;
        sqlDump += `-- Data: ${new Date().toISOString()}\n\n`;

        for (const [table, info] of Object.entries(backup.tables)) {
            const data = (info as any).data;
            if (data && data.length > 0) {
                sqlDump += `\n-- Tabela: ${table} (${data.length} registros)\n`;
                sqlDump += `-- Dados exportados em JSON para restauração\n`;
            }
        }

        const sqlFilename = `backups/backup_${timestamp}.sql`;
        writeFileSync(sqlFilename, sqlDump);
        console.log(`✅ SQL dump criado: ${sqlFilename}`);

    } catch (error) {
        console.error("❌ Erro ao criar backup:", error);
        process.exit(1);
    }
}

createBackup();
