// Declaracao do módulo compilado para evitar erro TS7016 ao importar em api/index.ts
declare module "../dist/server/app.js" {
  export function createApp(): Promise<any>;
}
// Arquivo mantido intencionalmente vazio para evitar erro de modulo relativo em ambient declarations.
