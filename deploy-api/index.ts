import express from "express";
import cors from "cors";
import { connectDB } from "../artifacts/api-server/src/lib/mongodb.js";
import router from "../artifacts/api-server/src/routes/index.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

let dbConnected = false;

export default async function handler(req: any, res: any) {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
  return app(req, res);
}
