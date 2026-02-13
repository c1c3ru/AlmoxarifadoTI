-- Execute este script no Console SQL do seu banco de dados (Neon / Supabase)
-- Isso vai corrigir o erro 500 ao criar movimentações

ALTER TABLE movements ALTER COLUMN previous_stock DROP NOT NULL;
ALTER TABLE movements ALTER COLUMN new_stock DROP NOT NULL;
