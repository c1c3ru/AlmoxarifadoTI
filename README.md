# SGAT-TI — Sistema de Gestão de Almoxarifado de TI

Aplicação full‑stack para gestão de itens de TI, movimentações (entrada/saída), controle de estoque com QR Code e autenticação por sessão.

## Sumário
- Visão Geral
- Requisitos
- Instalação
- Scripts
- Variáveis de Ambiente
- Desenvolvimento
- Build & Produção
- Notas do Scanner QR
- Estrutura do Projeto
- Troubleshooting

## Visão Geral
- Client: React 18 + Vite + Tailwind + Radix UI + React Query
- Server: Express + Drizzle ORM + PostgreSQL (Neon/Supabase) + Sessions (passport/local)
- Compartilhado: Tipos/Esquemas em TypeScript com Zod (`shared/`)

## Requisitos
- Node.js 18+
- PostgreSQL (ex.: Supabase/Neon)

## Instalação
1. Instale dependências
```bash
npm install
```
2. Configure as variáveis de ambiente (crie um `.env` na raiz). Veja seção abaixo.
3. Aplique o schema no banco
```bash
npm run db:push
```

## Scripts
- `npm run dev`: inicia o servidor Express com tsx (desenvolvimento)
- `npm run build`: build do client (Vite) e bundle do server (esbuild)
- `npm start`: inicia o server compilado de produção
- `npm run check`: checagem TypeScript
- `npm run db:push`: aplica schema Drizzle

## Variáveis de Ambiente
Crie `.env` na raiz com, por exemplo:
```
DATABASE_URL=postgres://user:pass@host:port/db
SESSION_SECRET=uma_chave_secreta_segura
# Opcional
PORT=3000
NODE_ENV=development
```

## Desenvolvimento
1. Rodar backend (com API e assets do client servidos pelo server de dev):
```bash
npm run dev
```
2. Acesse: http://localhost:3000

## Build & Produção
1. Build:
```bash
npm run build
```
2. Start produção:
```bash
npm start
```

## Notas do Scanner QR
- O componente `client/src/components/qr-scanner.tsx` usa a biblioteca `qr-scanner` para decodificar a câmera.
- Requisitos do navegador:
  - Permitir acesso à câmera.
  - HTTPS ou `http://localhost`.
  - iOS: preferir Safari; Android: Chrome.
- A página `client/src/pages/scanner.tsx` consome `GET /api/items/by-code?code=<valor>` após ler o QR.

## Estrutura do Projeto
```
api/
client/
  src/
    components/
    hooks/
    lib/
    pages/
server/
  app.ts
  index.ts
  routes.ts
shared/
  schema.ts
```

## Troubleshooting
- Câmera não abre: verifique permissões do navegador e protocolo (HTTPS/localhost).
- QR não reconhecido: garanta que o conteúdo do QR corresponde ao código interno do item cadastrado.
- Erro de banco: confirme `DATABASE_URL` e execute `npm run db:push`.
- Sessão/Autenticação: confirme `SESSION_SECRET` e cookies habilitados.

## Licença
MIT
