-- Migração: Adicionar coluna deleted_at à tabela users
-- Execute este script no seu banco de dados PostgreSQL

-- Adicionar coluna deleted_at (opcional, pode ser NULL)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Criar índice para melhorar performance nas consultas que filtram por deleted_at
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Comentário na coluna
COMMENT ON COLUMN users.deleted_at IS 'Timestamp de quando o usuário foi deletado (soft delete). NULL significa que o usuário não foi deletado.';

