const isLocalhost = (url: URL): boolean =>
  url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";

export const buildBackendUrl = (backendUrl: string | undefined, path: string): string | null => {
  const raw = backendUrl?.trim();
  if (!raw) {
    return null;
  }

  try {
    const baseUrl = new URL(raw);
    const isDev = process.env.NODE_ENV !== "production";
    if (baseUrl.protocol !== "https:" && !(isDev || isLocalhost(baseUrl))) {
      return null;
    }

    return new URL(path, baseUrl).toString();
  } catch {
    return null;
  }
};
