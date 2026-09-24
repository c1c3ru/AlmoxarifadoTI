-- Migração: recuperação de senha por link com token (hash) de uso único
-- Execute este script no seu banco de dados PostgreSQL.
--
-- A tabela password_resets guardava um código de 6 dígitos em texto puro
-- (coluna "code"). Ela passa a guardar apenas o hash SHA-256 de um token
-- aleatório de 256 bits. Como a tabela só contém dados temporários (códigos
-- que expiram em minutos), ela é recriada: solicitações pendentes antigas
-- deixam de valer e o usuário só precisa pedir um novo link.
-- O servidor também aplica esta migração automaticamente na primeira
-- conexão (server/storage.ts → ensurePasswordResetsTable).

DROP TABLE IF EXISTS password_resets;

CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

COMMENT ON COLUMN password_resets.token_hash IS 'SHA-256 (hex) do token enviado por e-mail. O token em claro nunca é armazenado.';
