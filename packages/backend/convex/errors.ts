import { ConvexError } from "convex/values";

export const PUBLIC_UNEXPECTED_ERROR_MESSAGE = "Oops, unexpected something happened!";

function toLoggableError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    value: error,
  };
}

export function withUnexpectedErrorLogging(
  operation: string,
  handler: (ctx: any, args: any) => Promise<any>,
) {
  return async (ctx: any, args: any) => {
    try {
      return await handler(ctx, args);
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }

      console.error(`[${operation}] unexpected Convex failure`, toLoggableError(error));
      throw new ConvexError(PUBLIC_UNEXPECTED_ERROR_MESSAGE);
    }
  };
}
