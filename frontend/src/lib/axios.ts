import axios from 'axios'

export class ApiError extends Error {
  readonly status: number | undefined
  readonly responseData: unknown

  constructor(message: string, status: number | undefined, responseData: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.responseData = responseData
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    ...(import.meta.env.VITE_API_KEY ? { 'X-API-Key': import.meta.env.VITE_API_KEY } : {}),
  },
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const isApiError = axios.isAxiosError<unknown, unknown>(error)
    const responseData = isApiError ? error.response?.data : undefined
    const detail =
      responseData && typeof responseData === 'object' && 'detail' in responseData
        ? responseData.detail
        : undefined
    const message =
      typeof detail === 'string'
        ? detail
        : isApiError && error.message
          ? error.message
          : 'An error occurred'
    return Promise.reject(
      new ApiError(message, isApiError ? error.response?.status : undefined, responseData),
    )
  },
)

export default api
