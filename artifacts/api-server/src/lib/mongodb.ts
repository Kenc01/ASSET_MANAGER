import mongoose, { Schema, Document, Model } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required but was not provided.");
}

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;
  await mongoose.connect(MONGODB_URI as string, {
    dbName: "dev-account-manager",
    tls: true,
    tlsAllowInvalidCertificates: true,
  });
  isConnected = true;
}

export type AccountStatus = "available" | "in-use" | "cooling-down" | "archived";

export interface IAccount extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordEncrypted: string;
  status: AccountStatus;
  notes: string | null;
  tags: string[];
  cooldownDurationHours: number | null;
  cooldownStartedAt: Date | null;
  lastUsedAt: Date | null;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    email: { type: String, required: true, unique: true },
    passwordEncrypted: { type: String, required: true },
    status: {
      type: String,
      enum: ["available", "in-use", "cooling-down", "archived"],
      default: "available",
    },
    notes: { type: String, default: null },
    tags: { type: [String], default: [] },
    cooldownDurationHours: { type: Number, default: null },
    cooldownStartedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    useCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const AccountModel: Model<IAccount> =
  mongoose.models.Account ?? mongoose.model<IAccount>("Account", accountSchema);
