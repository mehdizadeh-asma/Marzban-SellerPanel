import type { NextFunction, Request, Response } from "express";

import ConfigFile from "../config/Config";
import { getHttpErrorCode } from "../utils/HttpError";

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const ensureOptions = (() => {
  let initialized = false;
  let maxAttempts = 5;
  let windowMs = 60000;

  const loader = async (): Promise<void> => {
    const [max, window] = await Promise.all([
      ConfigFile.GetLoginRateLimitMax(),
      ConfigFile.GetLoginRateLimitWindowMs(),
    ]);
    maxAttempts = max;
    windowMs = window;
    initialized = true;
  };

  return async (): Promise<{ maxAttempts: number; windowMs: number }> => {
    if (!initialized) {
      await loader();
    }
    return { maxAttempts, windowMs };
  };
})();

const getClientIp = (req: Request): string => {
  if (req.ip && req.ip !== "::ffff:127.0.0.1" && req.ip !== "::1") {
    return req.ip;
  }
  return req.socket.remoteAddress || req.ip || "unknown";
};

export const createLoginRateLimiter = () => {
  const attempts = new Map<string, RateLimitEntry>();
  let cleanupInterval: NodeJS.Timeout | null = null;
  let windowMs = 60000;

  const scheduleCleanup = (): void => {
    if (cleanupInterval) return;
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of attempts.entries()) {
        if (entry.expiresAt <= now) {
          attempts.delete(key);
        }
      }
      if (attempts.size === 0 && cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    }, windowMs);
    cleanupInterval.unref();
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    ensureOptions()
      .then(({ maxAttempts, windowMs: newWindowMs }) => {
        windowMs = newWindowMs;
        scheduleCleanup();

        const key = getClientIp(req);
        const now = Date.now();
        const entry = attempts.get(key);

        if (!entry || entry.expiresAt <= now) {
          attempts.set(key, { count: 1, expiresAt: now + windowMs });
          return next();
        }

        if (entry.count >= maxAttempts) {
          res.status(429).json({
            message: "Too many login attempts. Please wait and try again.",
            code: getHttpErrorCode(429),
          });
          return;
        }

        entry.count += 1;
        attempts.set(key, entry);
        next();
      })
      .catch((error) => {
        console.error("Rate limiter error:", error);
        next();
      });
  };
};
