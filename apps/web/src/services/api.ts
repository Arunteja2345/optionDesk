import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

// Auto-attach JWT token to every request
api.interceptors.request.use((config) => {
  // Token is stored inside Zustand's persisted state under 'auth-store'
  try {
    const raw = localStorage.getItem('auth-store')
    if (raw) {
      const parsed = JSON.parse(raw)
      const token = parsed?.state?.token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch {
    // localStorage parse failed — ignore
  }
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-store')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)