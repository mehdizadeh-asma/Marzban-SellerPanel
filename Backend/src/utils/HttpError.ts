const STATUS_CODE_MAP: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
  503: "SERVICE_UNAVAILABLE",
};

export const getHttpErrorCode = (status: number): string =>
  STATUS_CODE_MAP[status] ?? `HTTP_${status}`;

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code ?? getHttpErrorCode(status);
  }
}

export const isHttpError = (error: unknown): error is HttpError =>
  error instanceof HttpError && Number.isFinite(error.status);
