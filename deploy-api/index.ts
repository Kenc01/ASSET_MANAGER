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
  try {
    if (!dbConnected) {
      console.log("Attempting to connect to MongoDB...");
      await connectDB();
      dbConnected = true;
      console.log("Successfully connected to MongoDB");
    }
    return app(req, res);
  } catch (error) {
    console.error("Vercel Handler Error:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}
