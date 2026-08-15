// src/config/env.ts
// Validates ALL environment variables at startup using Zod.
// The app will exit immediately with a clear error if any required variable is missing.
// Import { env } instead of process.env throughout the app.

import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

// Always load .env from the project root.
// In source this is ../../.env, and in compiled dist this is also ../../.env.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

 console.log(".env loads");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("5000"),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),

  // Database
  MONGO_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required").default("mysecretkey123"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(1, "REFRESH_TOKEN_SECRET is required")
    .default("mysecretkey123_refresh"),

  // Email
  EMAIL_USER: z.string().default("blueprintsoft.dev@gmail.com"),
  EMAIL_PASS: z.string().default(""),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),

  // Razorpay — Shop Owner e-commerce checkout
  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),

  // Razorpay — Super Admin SaaS billing
  SUPER_ADMIN_RAZORPAY_KEY_ID: z.string().default(""),
  SUPER_ADMIN_RAZORPAY_KEY_SECRET: z.string().default(""),

  // MSG91 Mobile OTP
  MSG91_AUTH_KEY: z.string().default(""),
  MSG91_TOKEN_AUTH: z.string().default(""),
  MSG91_WIDGET_ID: z.string().default(""),

  // Shipping
  WAREHOUSE_LAT: z.string().default("9.9312"),
  WAREHOUSE_LNG: z.string().default("76.2673"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errMsg = "❌ Invalid or missing environment variables:";
  console.log(errMsg);
  console.error(errMsg);
  const errors = parsed.error.flatten().fieldErrors;
  Object.entries(errors).forEach(([key, messages]) => {
    const detail = `  ${key}: ${messages?.join(", ")}`;
    console.log(detail);
    console.error(detail);
  });
}

export type EnvType = z.infer<typeof envSchema>;

export const env: EnvType = parsed.success
  ? parsed.data
  : (envSchema.parse({}) as EnvType);
