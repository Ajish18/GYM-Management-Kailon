import { NextResponse } from "next/server";

/** Standard error carrying an HTTP status + machine-readable code, matching
 *  the envelope in docs/10-api-design.md (§11.2–11.3). Thrown by handlers and
 *  converted to JSON by `handle()`. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const errors = {
  badRequest: (message = "Malformed request") => new ApiError(400, "BAD_REQUEST", message),
  unauthenticated: () => new ApiError(401, "UNAUTHENTICATED", "Missing or invalid session"),
  forbidden: (message = "You do not have permission to do this") => new ApiError(403, "FORBIDDEN", message),
  notFound: (message = "Resource not found") => new ApiError(404, "NOT_FOUND", message),
  conflict: (message: string) => new ApiError(409, "CONFLICT", message),
  validation: (issues: unknown) => new ApiError(422, "VALIDATION_ERROR", "Validation failed", issues),
  internal: (message = "Something went wrong") => new ApiError(500, "INTERNAL_ERROR", message),
};

export function ok(data: unknown, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, ...extra });
}

export function fail(err: ApiError) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    },
    { status: err.status },
  );
}

/** Wraps a route handler: converts ApiError → JSON, unknown errors → 500 with
 *  a server log (the response stays generic per §11.3). */
export function handle(
  handler: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>,
) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) return fail(err);
      console.error("[api/v1] unhandled error", err);
      return fail(errors.internal());
    }
  };
}

/** Offset pagination per §11.1: `?page=1&pageSize=25`, pageSize capped at 100. */
export function parsePagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 25));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Envelope for paginated lists: { data, page, pageSize, total, totalPages }. */
export function paginatedOk(data: unknown[], total: number, page: number, pageSize: number) {
  return ok(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
