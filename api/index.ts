let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  if (!appPromise) {
    // Em produção no Vercel, importe o arquivo já compilado pelo build.
    // Usar caminho dinâmico evita erro de resolução de módulo no TypeScript durante o dev.
    const distPath = "../dist/server/app.js";
    const mod: any = await import(distPath as any);
    const { createApp } = mod;
    appPromise = createApp();
  }
  const app = await appPromise;
  return app(req, res);
}
