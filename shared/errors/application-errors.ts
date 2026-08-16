export class ApplicationError extends Error {
  public code: string
  public status: number
  public details?: any

  constructor(message: string, code = 'INTERNAL_ERROR', status = 500, details?: any) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.status = status
    this.details = details
    Object.setPrototypeOf(this, new.target.prototype)
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    }
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication is required') {
    super(message, 'UNAUTHENTICATED', 401)
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 'UNAUTHORIZED', 403)
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404)
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message = 'Database operation failed', details?: any) {
    super(message, 'DATABASE_ERROR', 500, details)
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(serviceName: string, message: string) {
    super(`External service "${serviceName}" error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502)
  }
}
