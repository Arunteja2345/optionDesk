import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: string
  balance: number
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  updateBalance: (balance: number) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      updateBalance: (balance) => set(state => ({
        user: state.user ? { ...state.user, balance } : null
      })),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'auth-store' }
  )
)