import serverless from "serverless-http";

let cachedHandler: any;

export default async function handler(req: any, res: any) {
  if (!cachedHandler) {
    const { createApp } = await import("../dist/server/app.js");
    const app = await createApp();
    cachedHandler = serverless(app as any);
  }
  return cachedHandler(req, res);
}
