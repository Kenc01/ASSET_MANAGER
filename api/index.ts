import type { IncomingMessage, ServerResponse } from "http";
import { connectDB } from "../artifacts/api-server/src/lib/mongodb";
import app from "../artifacts/api-server/src/app";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  await connectDB();
  app(req as any, res as any);
}
