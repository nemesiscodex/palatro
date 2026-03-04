export const GENERIC_UNEXPECTED_ERROR_MESSAGE = "Oops, unexpected something happened!";

function unwrapKnownConvexMessage(message: string) {
  const match = message.match(/Uncaught ConvexError:\s*(.+?)(?:\n|$)/);
  if (!match) {
    return null;
  }

  const candidate = match[1]?.trim();
  if (!candidate) {
    return null;
  }

  return candidate.replace(/^"+|"+$/g, "");
}

function looksLikeFrameworkError(message: string) {
  return (
    message.includes("Request ID:") ||
    message.includes("Server Error") ||
    message.includes("Uncaught ") ||
    message.includes("\n")
  );
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallback = GENERIC_UNEXPECTED_ERROR_MESSAGE,
) {
  if (typeof error === "string") {
    return looksLikeFrameworkError(error) ? fallback : error;
  }

  if (!(error instanceof Error)) {
    return fallback;
  }

  const convexMessage = unwrapKnownConvexMessage(error.message);
  if (convexMessage) {
    return convexMessage;
  }

  return looksLikeFrameworkError(error.message) ? fallback : error.message;
}
