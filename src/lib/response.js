import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function successResponse(data, status = 200, extra = {}) {
  return Response.json(
    {
      success: true,
      data,
      ...extra,
    },
    { status },
  );
}

export function errorResponse(code, message, status) {
  return Response.json(
    {
      success: false,
      error: { code, message },
    },
    { status },
  );
}

export function handleApiError(error) {
  if (error instanceof ApiError) {
    return errorResponse(error.code, error.message, error.status);
  }

  if (error instanceof ZodError) {
    return errorResponse('VALIDATION_ERROR', 'Invalid request data.', 400);
  }

  if (error?.code === '22P02') {
    return errorResponse('INVALID_INPUT', 'Invalid input format.', 400);
  }

  if (error?.code === '23505') {
    return errorResponse('CONFLICT', 'Resource already exists.', 409);
  }

  console.error('[API ERROR]', error);
  return errorResponse('INTERNAL_ERROR', 'Internal server error.', 500);
}
