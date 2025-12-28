import fs from "fs";
import http from "http";
import path from "path";

import type { CorsOptions } from "cors";
import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import express from "express";

import ConfigFile from "./config/Config";
import MongooseDbManagement from "./db/MongooseDbManagement";
import { authenticate } from "./middleware/auth";
import accountRouter from "./routes/AccountRouter";
import marzbanRouter from "./routes/MarzbanRouter";
import sellerRouter from "./routes/SellerRouter";
import tariffInboundRouter from "./routes/TariffInboundRouter";
import tariffRouter from "./routes/TariffRouter";
import tariffSellerRouter from "./routes/TariffSellerRouter";
import { getHttpErrorCode, isHttpError } from "./utils/HttpError";

const app = express();
const TRUSTED_PROXY_HOPS = process.env.TRUST_PROXY_HOPS;
if (TRUSTED_PROXY_HOPS) {
  app.set("trust proxy", TRUSTED_PROXY_HOPS);
}

const packageVersion = (() => {
  try {
    const pkgPath = path.resolve(__dirname, "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version?: string };
    return typeof pkg.version === "string" ? pkg.version : "unknown";
  } catch {
    return "unknown";
  }
})();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

let allowedOrigins: string[] = ["*"];
let forceHttps = false;
let allowedOriginsLoaded = false;
let allowedOriginsPromise: Promise<string[]> | null = null;

const loadAllowedOrigins = (): Promise<string[]> => {
  if (allowedOriginsLoaded) return Promise.resolve(allowedOrigins);
  if (!allowedOriginsPromise) {
    allowedOriginsPromise = ConfigFile.GetAllowedOrigins()
      .then((origins) => {
        allowedOrigins = origins.length > 0 ? origins : ["*"];
        allowedOriginsLoaded = true;
        return allowedOrigins;
      })
      .catch((error) => {
        console.error("Failed to load CORS origins:", error);
        allowedOrigins = ["*"];
        allowedOriginsLoaded = true;
        return allowedOrigins;
      })
      .finally(() => {
        allowedOriginsPromise = null;
      });
  }
  return allowedOriginsPromise ?? Promise.resolve(allowedOrigins);
};

let forceHttpsLoaded = false;
let forceHttpsPromise: Promise<boolean> | null = null;

const loadForceHttps = (): Promise<boolean> => {
  if (forceHttpsLoaded) return Promise.resolve(forceHttps);
  if (!forceHttpsPromise) {
    forceHttpsPromise = ConfigFile.ShouldForceHttps()
      .then((value) => {
        forceHttps = value;
        forceHttpsLoaded = true;
        return forceHttps;
      })
      .catch((error) => {
        console.error("Failed to determine HTTPS enforcement:", error);
        forceHttps = false;
        forceHttpsLoaded = true;
        return forceHttps;
      })
      .finally(() => {
        forceHttpsPromise = null;
      });
  }
  return forceHttpsPromise ?? Promise.resolve(forceHttps);
};

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    loadAllowedOrigins()
      .then((origins) => {
        if (!origin) return callback(null, true);
        if (origins.includes("*") || origins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      })
      .catch((error) => callback(error));
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: false,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use((req, res, next) => {
  loadForceHttps()
    .then((enabled) => {
      if (!enabled || req.secure || req.protocol === "https") {
        return next();
      }
      const host = req.headers.host;
      if (!host) {
        return res
          .status(400)
          .json({ message: "Host header is required", code: getHttpErrorCode(400) });
      }
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    })
    .catch(() => next());
});

app.use("/api/marzban", marzbanRouter);
app.use("/api", sellerRouter);
app.use("/api", tariffRouter);
app.use("/api", accountRouter);
app.use("/api", tariffSellerRouter);
app.use("/api", tariffInboundRouter);

app.get("/health", authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    status: "UP",
    dbConnection: MongooseDbManagement.getMainConnection() ? "CONNECTED" : "DISCONNECTED",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Marzban Seller Panel API",
    version: packageVersion,
    documentation: "/api-docs",
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = isHttpError(err) ? err.status : 500;
  const message =
    status >= 500
      ? process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message
      : err.message;
  console.error(`[${new Date().toISOString()}] Global Error:`, err.message);

  if (res.headersSent) return next(err);

  const code = isHttpError(err) ? err.code : getHttpErrorCode(status);
  res.status(status).json({ message, code });
});

const httpServer = http.createServer(app);
const HTTP_PORT = process.env.HTTP_PORT || 8080;

const bootstrap = async (): Promise<void> => {
  try {
    console.log("Checking license...");
    const isValidLicense = await MongooseDbManagement.checkLicense();

    if (!isValidLicense) {
      throw new Error("License is not available or expired");
    }

    console.log("Connecting to main database...");
    await MongooseDbManagement.connectMainDatabase();

    httpServer.listen(HTTP_PORT, () => {
      console.log(`HTTP server running on port ${HTTP_PORT}`);
    });

    console.log("Server is ready to handle requests");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

const gracefulShutdown = async (): Promise<void> => {
  console.log("Starting graceful shutdown...");

  await new Promise<void>((resolve) => {
    httpServer.close(() => {
      console.log("HTTP server closed");
      resolve();
    });
  });

  await MongooseDbManagement.shutdown();

  console.log("Graceful shutdown complete");
};

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

bootstrap().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
