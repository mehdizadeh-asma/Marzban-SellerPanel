import http from "http";
import https from "https";

import bodyParser from "body-parser";
import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import express from "express";

import accountRouter from "./routes/AccountRouter";
import marzbanRouter from "./routes/MarzbanRouter";
import sellerRouter from "./routes/SellerRouter";
import tariffInboundRouter from "./routes/TariffInboundRouter";
import tariffRouter from "./routes/TariffRouter";
import tariffSellerRouter from "./routes/TariffSellerRouter";
import Certificate from "./utils/Certificate";
import MongooseDbManagement from "./utils/MongooseDbManagement";

const app = express();

// تنظیمات اولیه اکسپرس
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// تنظیمات CORS
const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// مدیریت خطاهای CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  next();
});

// مسیرهای API
app.use("/api/marzban", marzbanRouter);
app.use("/api", sellerRouter);
app.use("/api", tariffRouter);
app.use("/api", accountRouter);
app.use("/api", tariffSellerRouter);
app.use("/api", tariffInboundRouter);

// مسیر سلامت (Health Check)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "UP",
    dbConnection: MongooseDbManagement.getMainConnection() ? "CONNECTED" : "DISCONNECTED",
    timestamp: new Date().toISOString(),
  });
});

// مسیر اصلی
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Marzban Seller Panel API",
    version: "1.0.0",
    documentation: "/api-docs",
  });
});

// مدیریت خطاهای جهانی
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] Global Error:`, err.message);

  if (res.headersSent) return next(err);

  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
  });
});

// ایجاد سرورهای HTTP و HTTPS
const credentials = Certificate.GetCredential();
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

// پورت‌های سرور
const HTTP_PORT = process.env.HTTP_PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;

// تابع راه‌اندازی اصلی
const bootstrap = async (): Promise<void> => {
  try {
    // 1. بررسی لایسنس
    console.log("Checking license...");
    const isValidLicense = await MongooseDbManagement.checkLicense();

    if (!isValidLicense) {
      throw new Error("License is not available or expired");
    }

    // 2. اتصال به دیتابیس اصلی
    console.log("Connecting to main database...");
    await MongooseDbManagement.connectMainDatabase();

    // 3. راه‌اندازی سرورها
    httpServer.listen(HTTP_PORT, () => {
      console.log(`HTTP server running on port ${HTTP_PORT}`);
    });

    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`HTTPS server running on port ${HTTPS_PORT}`);
    });

    // 4. گزارش وضعیت
    console.log("Server is ready to handle requests");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1); // خروج با کد خطا
  }
};

// مدیریت خاتمه تمیز برنامه
const gracefulShutdown = async (): Promise<void> => {
  console.log("Starting graceful shutdown...");

  // 1. بستن سرورها
  await new Promise<void>((resolve) => {
    httpServer.close(() => {
      console.log("HTTP server closed");
      resolve();
    });
  });

  await new Promise<void>((resolve) => {
    httpsServer.close(() => {
      console.log("HTTPS server closed");
      resolve();
    });
  });

  // 2. بستن اتصالات دیتابیس
  await MongooseDbManagement.shutdown();

  console.log("Graceful shutdown complete");
  process.exit(0);
};

// ثبت هندلرهای سیگنال
process.on("SIGINT", () => {
  gracefulShutdown()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});
process.on("SIGTERM", () => {
  gracefulShutdown()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  gracefulShutdown()
    .then(() => process.exit(1))
    .catch(() => process.exit(1));
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown()
    .then(() => process.exit(1))
    .catch(() => process.exit(1));
});

// راه‌اندازی برنامه
bootstrap().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
