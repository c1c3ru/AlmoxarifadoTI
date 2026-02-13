# 📱 Ajuste de Responsividade e Correção de Erro 500

## 1. Toast Responsivo (Ajustado)
Atualizei o componente de mensagens para funcionar melhor em celulares:
- Texto quebra linha automaticamente (`break-words`)
- Alinhamento melhorado
- Fundo sólido para leitura clara em qualquer fundo

As alterações já foram enviadas para o repositório!

## 2. 🔴 AÇÃO CRÍTICA PARA ERRO 500

O erro 500 na movimentação persiste porque o **banco de dados de produção** ainda exige os campos antigos (`previous_stock` e `new_stock`). As alterações no código já foram feitas, mas o banco precisa ser atualizado.

**Como Corrigir:**
1. Acesse o painel do seu banco de dados (Neon Console ou Supabase)
2. Abra o "SQL Editor"
3. Cole e execute este comando SQL:

```sql
ALTER TABLE movements ALTER COLUMN previous_stock DROP NOT NULL;
ALTER TABLE movements ALTER COLUMN new_stock DROP NOT NULL;
```

**Assim que você rodar isso, o erro 500 vai desaparecer!** 🚀
