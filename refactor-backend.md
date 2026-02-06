# Refatoração e Melhorias do Backend - Almoxarifado TI

Este plano descreve as etapas para melhorar a arquitetura, segurança e integridade de dados da aplicação, conforme discutido.

## 1. Arquitetura: Referatoração de Rotas e Camada de Serviço

### 1.1. Divisão de Rotas
Atualmente, `routes.ts` centraliza tudo. Vamos dividir em:
- `server/routes/auth.ts`: Login, Registro, Recuperação de Senha.
- `server/routes/inventory.ts`: Itens, Categorias, Importação/Exportação.
- `server/routes/users.ts`: Gestão de usuários (Admin).
- `server/routes/dashboard.ts`: Estatísticas e logs de atividade.

### 1.2. Camada de Serviço (Opcional, mas recomendado)
Mover a lógica de negócio complexa (ex: parsing de CSV, verificação de estoque) para arquivos específicos em `server/services/`.

## 2. Banco de Dados: Transações e Integridade

### 2.1. Transações para Movimentação de Estoque
Implementar transações no Drizzle para garantir que `previousStock`, `quantity` e `newStock` sejam calculados de forma atômica em `storage.ts`.

### 2.2. Migração de Esquema
Substituir as funções `ensure...` por um script de migração formal ou garantir que o `drizzle-kit push` seja suficiente para os novos campos (como a tabela de reset de senha).

## 3. Segurança: Persistência de Reset de Senha

### 3.1. Tabela de Reset de Senha
Remover o `Map` em memória em `routes.ts` e criar uma tabela `password_resets` no banco de dados.
- Justificativa: Sobrevivência a reinícios do servidor e melhor auditabilidade.

## 4. Correção de Bugs: Edição de Usuário

### 4.1. Investigação e Fix
Garantir que o ID do usuário seja passado corretamente e que a rota `PUT /api/users/:id` não esteja criando novos registros (conflito de lógica com `storage.createUser`).

---

## Cronograma de Execução

1. **Fase 1**: Refatoração de Rotas (Arquitetura).
2. **Fase 2**: Implementação de Transações e Tabela de Reset (Banco/Segurança).
3. **Fase 3**: Verificação e Testes de Regressão.
