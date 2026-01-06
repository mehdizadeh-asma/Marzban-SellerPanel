import { buildBackendUrl } from "@/utils/backendUrl";

export const INVALID_BACKEND_URL_MESSAGE = "Invalid BACKEND_URL. Use HTTPS in production.";

export class InvalidBackendUrlError extends Error {
  constructor() {
    super(INVALID_BACKEND_URL_MESSAGE);
    this.name = "InvalidBackendUrlError";
  }
}

export const getBackendUrl = (backendUrl: string | undefined, path: string): string => {
  const url = buildBackendUrl(backendUrl, path);
  if (!url) {
    throw new InvalidBackendUrlError();
  }
  return url;
};

export const isInvalidBackendUrlError = (error: unknown): error is InvalidBackendUrlError =>
  error instanceof InvalidBackendUrlError;
