import type { NextFunction, Request, Response } from "express";

import type { SessionRole } from "../models/Session";
import type { AuthTokenPayload } from "../services/auth/AuthService";
import { AuthService } from "../services/auth/AuthService";
import { getHttpErrorCode } from "../utils/HttpError";

interface RequestUser {
  role: SessionRole;
  sellerId: string | null;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
  marzbanToken?: string;
}

const unauthorizedResponse = (res: Response): Response =>
  res.status(401).json({ message: "Unauthorized", code: getHttpErrorCode(401) });

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorizedResponse(res);
    }

    const token = authHeader.split(" ")[1];
    const decoded = (await AuthService.verifyAccessToken(token)) as AuthTokenPayload;
    const session = await AuthService.getSessionById(decoded.sessionId);
    if (!session) {
      return unauthorizedResponse(res);
    }
    const sessionSellerId = session.sellerId ? session.sellerId.toString() : null;
    if (
      decoded.sessionId !== session._id.toString() ||
      decoded.role !== session.role ||
      decoded.sellerId !== sessionSellerId
    ) {
      return unauthorizedResponse(res);
    }
    if (session.role === "seller" && !sessionSellerId) {
      return unauthorizedResponse(res);
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await AuthService.invalidateSession(session._id.toString());
      return unauthorizedResponse(res);
    }
    if (!session.marzbanTokenExpiresAt || session.marzbanTokenExpiresAt.getTime() < Date.now()) {
      await AuthService.invalidateSession(session._id.toString());
      return unauthorizedResponse(res);
    }

    const marzbanToken = session.marzbanToken.startsWith("Bearer ")
      ? session.marzbanToken
      : `Bearer ${session.marzbanToken}`;

    req.user = {
      role: session.role,
      sellerId: sessionSellerId,
      sessionId: session._id.toString(),
    };
    req.marzbanToken = marzbanToken;
    req.headers.authorization = marzbanToken;

    return next();
  } catch (error) {
    console.error("Authentication error:", error);
    return unauthorizedResponse(res);
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void | Response => {
  if (req.user?.role !== "admin") {
    return unauthorizedResponse(res);
  }
  return next();
};

export const requireSeller = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void | Response => {
  if (req.user?.role !== "seller") {
    return unauthorizedResponse(res);
  }
  return next();
};

export const requireSellerOrAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void | Response => {
  const role = req.user?.role;
  if (role !== "seller" && role !== "admin") {
    return unauthorizedResponse(res);
  }
  return next();
};
