import type { NextFunction, Response } from "express";

import { getHttpErrorCode, isHttpError } from "./HttpError";

export const handleControllerError = (error: unknown, res: Response, next: NextFunction): void => {
  if (isHttpError(error)) {
    res.status(error.status).json({
      message: error.message,
      code: error.code ?? getHttpErrorCode(error.status),
    });
    return;
  }
  next(error);
};
