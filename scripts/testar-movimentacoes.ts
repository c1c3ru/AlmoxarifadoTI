import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function testarMovimentacoes() {
    console.log("=== TESTE DE MOVIMENTAÇÕES ===\n");

    try {
        // Contar total de movimentações
        const [totalResult] = await sql`SELECT COUNT(*)::int as total FROM movements`;
        console.log(`✓ Total de movimentações no banco: ${totalResult.total}\n`);

        if (totalResult.total === 0) {
            console.log("⚠️  Não há movimentações registradas no banco de dados!");
            console.log("   Isso explica por que não aparecem no dashboard.\n");
            return;
        }

        // Buscar últimas 5 movimentações
        const movements = await sql`
      SELECT 
        m.id,
        m.type,
        m.quantity,
        m.previous_stock,
        m.new_stock,
        m.created_at,
        i.name as item_name,
        u.name as user_name
      FROM movements m
      LEFT JOIN items i ON m.item_id = i.id
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
      LIMIT 5
    `;

        console.log("=== ÚLTIMAS 5 MOVIMENTAÇÕES ===");
        movements.forEach((mov: any, idx: number) => {
            console.log(`\n${idx + 1}. ${mov.item_name || 'Item não encontrado'}`);
            console.log(`   Tipo: ${mov.type}`);
            console.log(`   Quantidade: ${mov.quantity}`);
            console.log(`   Usuário: ${mov.user_name || 'Usuário não encontrado'}`);
            console.log(`   Data: ${new Date(mov.created_at).toLocaleString('pt-BR')}`);
        });

    } catch (error) {
        console.error("❌ Erro ao testar movimentações:", error);
    }
}

testarMovimentacoes();
