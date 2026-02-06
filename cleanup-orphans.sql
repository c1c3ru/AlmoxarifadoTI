-- Script de limpeza para preparar migração
-- Remove registros órfãos de user_activity

DELETE FROM user_activity 
WHERE user_id NOT IN (SELECT id FROM users);

-- Verificar se há outros problemas
SELECT 'Órfãos removidos' as status;
