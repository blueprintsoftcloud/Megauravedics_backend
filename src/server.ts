import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import { env } from "./config/env";
import "./config/prisma";
import { connectDB } from "./config/database";
import { seedDefaultPlans } from "./utils/planSeeder";
import { errorHandler } from "./middleware/errorHandler.middleware";
import { generalLimiter } from "./middleware/rateLimit.middleware";
import initSocket from "./socket/socketManager";

// Routes
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import superAdminRoutes from "./routes/superAdmin.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import userRoutes from "./routes/user.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import addressRoutes from "./routes/address.routes";
import notificationRoutes from "./routes/notification.routes";
import couponRoutes from "./routes/coupon.routes";
import analyticsRoutes from "./routes/analytics.routes";
import staffRoutes from "./routes/staff.routes";
import auditLogRoutes from "./routes/auditLog.routes";
import settingsRoutes from "./routes/settings.routes";
import paymentLogRoutes from "./routes/paymentLog.routes";
import reviewRoutes from "./routes/review.routes";
import homeBannerRoutes from "./routes/homeBanner.routes";
import billingRoutes from "./routes/billing.routes";


const app = express();
const server = http.createServer(app);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Apex Domain Redirect (megauravedics.com -> www.megauravedics.com) ──────
app.use((req, res, next) => {
  const host = req.headers.host;
  if (host === "megauravedics.com" || host === "http://megauravedics.com") {
    return res.redirect(301, `https://www.megauravedics.com${req.url}`);
  }
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = env.ALLOWED_ORIGINS
  .split(",")
  .map((o: string) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed = ALLOWED_ORIGINS.some((allowed: string) => {
        if (allowed === origin) return true;
        // Match domain with or without www / http / https
        const cleanAllowed = allowed.replace(/^https?:\/\/(www\.)?/, "");
        const cleanOrigin = origin.replace(/^https?:\/\/(www\.)?/, "");
        return cleanAllowed === cleanOrigin;
      });

      if (isAllowed) {
        return callback(null, true);
      }
      // Pass false to disallow origin cleanly without throwing 500 error
      return callback(null, false);
    },
    credentials: true,
  }),
);

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

// ── Core Middleware ────────────────────────────────────────────────────────────
// Trust the nginx reverse proxy so that express-rate-limit can read the real
// client IP from X-Forwarded-For without throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

// ── General Rate Limiter ──────────────────────────────────────────────────────
app.use("/api", generalLimiter);

// ── Static Uploads ────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

initSocket(io);
app.set("socketio", io);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/product", productRoutes);
app.use("/api/user", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/payment-logs", paymentLogRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/home-banners", homeBannerRoutes);
app.use("/api/billing", billingRoutes);

// ── Serve React Frontend ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../client")));

// ── React Router Catch-all ─────────────────────────────────────────────────
// NEW - works with Express 5
app.get("*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "../client", "index.html"));
});

// ── Error Handler (MUST BE MOUNTED LAST) ──────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const startServer = async () => {
  const PORT = Number(env.PORT ?? process.env.PORT ?? 5000);
  
  // Bind HTTP server immediately so cloud platforms pass health check <3s
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on PORT ${PORT}`);
  });

  try {
    console.log("Connecting to MongoDB...");
    await connectDB();
    console.log("MongoDB connected.");
    await seedDefaultPlans();
  } catch (error) {
    console.error("MongoDB connection error during startup:", error);
  }
};

startServer();

export default app;

