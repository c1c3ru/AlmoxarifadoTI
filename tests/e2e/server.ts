import express from "express";
import path from "node:path";

// UI-only server. API calls must be handled explicitly by each browser fixture.
const app = express();
app.use("/api", (_req, res) => res.status(501).json({ message: "Missing UI fixture" }));
app.use(express.static(path.resolve("dist/public")));
app.get("*", (_req, res) => res.sendFile(path.resolve("dist/public/index.html")));
app.listen(4173, "127.0.0.1");
