let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  if (!appPromise) {
    const { createApp } = await import("../dist/server/app.js");
    appPromise = createApp();
  }
  const app = await appPromise;
  return app(req, res);
}
