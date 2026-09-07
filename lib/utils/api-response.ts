import { NextResponse } from 'next/server'

export type ApiSuccessResponse<T> = {
  data: T
  error: null
}

export type ApiErrorResponse = {
  data: null
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data, error: null }, { status })
}

export function apiError(
  code: string,
  message: string,
  status = 400
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}

export const Errors = {
  UNAUTHORIZED: () => apiError('UNAUTHORIZED', 'Authentication required', 401),
  FORBIDDEN: (message = 'You do not have permission to perform this action') => apiError('FORBIDDEN', message, 403),
  NOT_FOUND: (entity = 'Resource') => apiError('NOT_FOUND', `${entity} not found`, 404),
  VALIDATION: (message: string) => apiError('VALIDATION_ERROR', message, 422),
  INTERNAL: (message = 'An unexpected error occurred') => apiError('INTERNAL_ERROR', message, 500),
  CONFLICT: (message: string) => apiError('CONFLICT', message, 409),
}

export function fromUnknownError(error: unknown, fallback = 'An unexpected error occurred') {
  const err = error as { name?: string; message?: string }
  if (err?.name === 'AuthorizationError') return Errors.FORBIDDEN(err.message)
  if (err?.name === 'AuthenticationError') return Errors.UNAUTHORIZED()
  if (err?.name === 'NotFoundError') {
    const label = err.message?.replace(/\s+not found$/i, '') || 'Resource'
    return Errors.NOT_FOUND(label)
  }
  if (err?.name === 'ValidationError') return Errors.VALIDATION(err.message || 'Invalid request')
  if (err?.name === 'ConflictError') return Errors.CONFLICT(err.message || 'Conflict')
  if ((error as { code?: string }).code === 'P2002') {
    return Errors.CONFLICT('A record with these values already exists')
  }
  return Errors.INTERNAL(err?.message || fallback)
}
