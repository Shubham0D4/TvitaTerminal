import type { ApiResponse } from './api-response'

export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, code = 'INTERNAL_ERROR', status = 500) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers)
  if (!headers.has('Content-Type') && options?.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const contentType = response.headers.get('Content-Type') || ''

  if (response.status === 204) {
    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, 'REQUEST_FAILED', response.status)
    }
    return null as unknown as T
  }

  if (contentType.includes('application/json')) {
    let json: ApiResponse<T>
    try {
      json = await response.json()
    } catch {
      throw new ApiError('Invalid server response format', 'INVALID_RESPONSE', response.status)
    }

    if (json.error || !response.ok) {
      const errorMsg = json.error?.message || `Request failed with status ${response.status}`
      const errorCode = json.error?.code || 'UNKNOWN_ERROR'
      throw new ApiError(errorMsg, errorCode, response.status)
    }

    return json.data
  }

  // Non-JSON response
  let text = ''
  try {
    text = await response.text()
  } catch {}

  if (!response.ok) {
    throw new ApiError(text || `Request failed with status ${response.status}`, 'REQUEST_FAILED', response.status)
  }

  return text as unknown as T
}

export async function apiClient<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: { message: string; code?: string } }> {
  try {
    const data = await apiRequest<T>(url, options)
    return { success: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    const code = (err && typeof err === 'object' && 'code' in err) ? String((err as Record<string, unknown>).code) : 'UNKNOWN_ERROR'
    return {
      success: false,
      error: {
        message,
        code,
      },
    }
  }
}

apiClient.get = <T>(url: string, headers?: HeadersInit) =>
  apiRequest<T>(url, { method: 'GET', headers })

apiClient.post = <T>(url: string, body?: unknown, headers?: HeadersInit) =>
  apiRequest<T>(url, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
    headers,
  })

apiClient.put = <T>(url: string, body?: unknown, headers?: HeadersInit) =>
  apiRequest<T>(url, {
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
    headers,
  })

apiClient.patch = <T>(url: string, body?: unknown, headers?: HeadersInit) =>
  apiRequest<T>(url, {
    method: 'PATCH',
    body: body instanceof FormData ? body : JSON.stringify(body),
    headers,
  })

apiClient.delete = <T>(url: string, headers?: HeadersInit) =>
  apiRequest<T>(url, { method: 'DELETE', headers })
