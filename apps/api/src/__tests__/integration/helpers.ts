/**
 * Test Helpers
 *
 * Utilities for making HTTP requests to the API in tests.
 */
import app from '../../index'
import type { TeacherWithAuth } from './factories'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
  auth?: TeacherWithAuth | string // TeacherWithAuth or raw token
  cookies?: Record<string, string>
}

interface TestResponse<T = unknown> {
  status: number
  body: T
  headers: Headers
}

/**
 * Make a request to the test app
 */
export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<TestResponse<T>> {
  const { method = 'GET', body, headers = {}, auth, cookies } = options

  const requestHeaders: Record<string, string> = {
    ...headers,
  }

  // Add auth header
  if (auth) {
    const token = typeof auth === 'string' ? auth : auth.accessToken
    requestHeaders['Authorization'] = `Bearer ${token}`
  }

  // Add content-type for body requests
  if (body) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  // Add cookies
  if (cookies) {
    requestHeaders['Cookie'] = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')
  }

  const url = path.startsWith('http') ? path : `http://localhost${path}`

  const res = await app.request(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })

  let responseBody: T
  const contentType = res.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    responseBody = (await res.json()) as T
  } else {
    responseBody = (await res.text()) as unknown as T
  }

  return {
    status: res.status,
    body: responseBody,
    headers: res.headers,
  }
}

// Convenience methods
export const get = <T = unknown>(path: string, options?: Omit<RequestOptions, 'method'>) =>
  request<T>(path, { ...options, method: 'GET' })

export const post = <T = unknown>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, 'method' | 'body'>
) => request<T>(path, { ...options, method: 'POST', body })

export const patch = <T = unknown>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, 'method' | 'body'>
) => request<T>(path, { ...options, method: 'PATCH', body })

export const del = <T = unknown>(path: string, options?: Omit<RequestOptions, 'method'>) =>
  request<T>(path, { ...options, method: 'DELETE' })

/**
 * Extract error info from response body
 */
export function getError(body: unknown): { error: string; message: string } | null {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    return body as { error: string; message: string }
  }
  return null
}

/**
 * Extract data from response body
 */
export function getData<T>(body: unknown): T | null {
  if (typeof body === 'object' && body !== null && 'data' in body) {
    return (body as { data: T }).data
  }
  return null
}

/**
 * Parse Set-Cookie header to extract cookies
 */
export function parseCookies(headers: Headers): Record<string, string> {
  const cookies: Record<string, string> = {}
  const setCookie = headers.get('set-cookie')
  if (setCookie) {
    // Handle multiple Set-Cookie headers (joined with comma by Hono)
    const parts = setCookie.split(/,(?=[^;]*=)/)
    for (const part of parts) {
      const match = part.match(/^([^=]+)=([^;]*)/)
      if (match) {
        cookies[match[1].trim()] = match[2]
      }
    }
  }
  return cookies
}

/**
 * Assert response status and return typed body
 */
export function assertStatus<T>(response: TestResponse<T>, expectedStatus: number): T {
  if (response.status !== expectedStatus) {
    const body =
      typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : response.body
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}. Body: ${body}`)
  }
  return response.body
}
