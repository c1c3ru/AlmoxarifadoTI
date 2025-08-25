let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  if (!appPromise) {
    // Importa do código-fonte TypeScript; o build da Vercel compilará para JS
    const { createApp } = await import("../server/app");
    appPromise = createApp();
  }
  const app = await appPromise;
  return app(req, res);
}
