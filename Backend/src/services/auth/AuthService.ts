import type { Algorithm, SignOptions, VerifyOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import type { Types } from "mongoose";

import ConfigFile from "../../config/Config";
import { getModel } from "../../db/MongooseModel";
import type { ISession, SessionDocument, SessionRole } from "../../models/Session";
import { SessionSchema } from "../../models/Session";

export interface AuthTokenPayload {
  sub: string;
  role: SessionRole;
  sellerId: string | null;
  sessionId: string;
}

export interface AuthSessionContext {
  userId?: Types.ObjectId;
  sellerId?: Types.ObjectId;
  role: SessionRole;
  marzbanToken: string;
  marzbanTokenExpiresAt?: Date;
}

export interface AuthSessionResult {
  accessToken: string;
  session: SessionDocument;
  expiresAt: Date;
}

export class AuthService {
  private static async getAuthConfig(): Promise<{
    ttlMinutes: number;
    jwtExpiresIn: string;
    jwtSecret: string;
    jwtIssuer?: string;
    jwtAudience?: string;
    jwtAlgorithms: string[];
  }> {
    const [ttlMinutes, jwtExpiresIn, jwtSecret, jwtIssuer, jwtAudience, jwtAlgorithms] =
      await Promise.all([
        ConfigFile.GetSessionTtlMinutes(),
        ConfigFile.GetJwtExpiresIn(),
        ConfigFile.GetJwtSecret(),
        ConfigFile.GetJwtIssuer(),
        ConfigFile.GetJwtAudience(),
        ConfigFile.GetJwtAlgorithms(),
      ]);

    return { ttlMinutes, jwtExpiresIn, jwtSecret, jwtIssuer, jwtAudience, jwtAlgorithms };
  }

  static async createSessionAndToken(context: AuthSessionContext): Promise<AuthSessionResult> {
    const { ttlMinutes, jwtExpiresIn, jwtSecret, jwtIssuer, jwtAudience, jwtAlgorithms } =
      await this.getAuthConfig();
    const allowedAlgorithms: Algorithm[] = ["HS256", "HS384", "HS512"];
    const normalizedAlgorithms = jwtAlgorithms.filter((alg): alg is Algorithm =>
      allowedAlgorithms.includes(alg as Algorithm),
    );
    const fallbackAlgorithms: Algorithm[] = ["HS256"];
    const algorithms = normalizedAlgorithms.length > 0 ? normalizedAlgorithms : fallbackAlgorithms;
    const SessionModel = await getModel<ISession>("Session", SessionSchema);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const marzbanTokenExpiresAt =
      context.marzbanTokenExpiresAt ?? new Date(Date.now() + 30 * 60 * 1000);

    const session = await SessionModel.create({
      userId: context.userId,
      sellerId: context.sellerId,
      role: context.role,
      marzbanToken: context.marzbanToken,
      marzbanTokenExpiresAt,
      expiresAt,
    });

    const payload: AuthTokenPayload = {
      sub: context.userId?.toString() ?? context.sellerId?.toString() ?? session._id.toString(),
      role: context.role,
      sellerId: context.sellerId ? context.sellerId.toString() : null,
      sessionId: session._id.toString(),
    };

    const signOptions: SignOptions = {
      expiresIn: jwtExpiresIn as SignOptions["expiresIn"],
    };
    if (jwtIssuer) {
      signOptions.issuer = jwtIssuer;
    }
    if (jwtAudience) {
      signOptions.audience = jwtAudience;
    }
    signOptions.algorithm = algorithms[0];
    const accessToken = jwt.sign(payload, jwtSecret, signOptions);

    return {
      accessToken,
      session,
      expiresAt,
    };
  }

  static async getSessionById(sessionId: string): Promise<SessionDocument | null> {
    const SessionModel = await getModel<ISession>("Session", SessionSchema);
    return SessionModel.findById(sessionId);
  }

  static async invalidateSession(sessionId: string): Promise<void> {
    const SessionModel = await getModel<ISession>("Session", SessionSchema);
    await SessionModel.deleteOne({ _id: sessionId });
  }

  static async verifyAccessToken(token: string): Promise<AuthTokenPayload> {
    const { jwtSecret, jwtIssuer, jwtAudience, jwtAlgorithms } = await this.getAuthConfig();
    const allowedAlgorithms: Algorithm[] = ["HS256", "HS384", "HS512"];
    const normalizedAlgorithms = jwtAlgorithms.filter((alg): alg is Algorithm =>
      allowedAlgorithms.includes(alg as Algorithm),
    );
    const fallbackAlgorithms: Algorithm[] = ["HS256"];
    const algorithms = normalizedAlgorithms.length > 0 ? normalizedAlgorithms : fallbackAlgorithms;
    const verifyOptions: VerifyOptions = {
      algorithms,
    };
    if (jwtIssuer) {
      verifyOptions.issuer = jwtIssuer;
    }
    if (jwtAudience) {
      verifyOptions.audience = jwtAudience;
    }
    return jwt.verify(token, jwtSecret, verifyOptions) as AuthTokenPayload;
  }
}
