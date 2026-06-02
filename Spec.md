# Spec

## 1. shared/schema.ts
**Action: MODIFY**
- Add `unit: text("unit").notNull().default("un")` to the `items` table.
- We will assume a simple text field to easily accommodate formats like "un", "cx", "kg", "m", etc.

## 2. server/routes/inventory.ts
**Action: MODIFY**
- Create endpoint `GET /api/inventory/export-excel`.
- Use `xlsx` library: `import * as XLSX from 'xlsx'`.
- Format data, build a workbook and worksheet, and send it back as a buffer.

## 3. client/src/components/csv-import-export.tsx
**Action: MODIFY**
- Add an "Exportar XLSX" button.
- Implement `exportExcelMutation` identical to `exportMutation` but calling `/api/inventory/export-excel`.

## 4. client/src/pages/items.tsx
**Action: MODIFY**
- In the "Estoque" column rendering (`<td ... data-testid="item-stock-{item.id}">`), replace the static number with an inline-editable input.
- Also add an inline-editable input for the `unit` field right next to it or below it.
- Create an `updateItemMutation` that calls `apiRequest('PUT', \`/api/items/\${id}\`, { currentStock, unit })`.
- Make it visually appealing using `frontend-design` aesthetics: focus outlines, soft borders, clean typography.
