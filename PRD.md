# PRD: Listagem, Exportação XLSX e Edição Direta

## Affected Files
1. `shared/schema.ts`
2. `server/routes/inventory.ts`
3. `client/src/components/csv-import-export.tsx`
4. `client/src/pages/items.tsx`

## Requirements
- Add `unit` (unidade de medida, ex: UN, CX) field to the `items` schema.
- Support exporting the inventory table to `.xlsx` in addition to `.csv`.
- Implement inline editing for both `currentStock` (qtde) and `unit` (unidade) directly within the items listing table.
- Maintain visual standard and use best practices.

## Existing Implementation Patterns
- Item Schema: `items` defined with drizzle pgTable. 
- CSV Export: Endpoint `/api/inventory/export` responds with `text/csv`.
- React Query: `useMutation` is used for server calls in `client`. `apiRequest` from `@/lib/queryClient`.
- Inline editing: Not currently present in this table, but `useMutation` on PUT `/api/items/:id` can be used.

## Libraries
- `xlsx` installed to generate Excel files.
