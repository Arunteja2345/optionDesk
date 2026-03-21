import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyTheme(next)
      },
      setTheme: (t) => {
        set({ theme: t })
        applyTheme(t)
      },
    }),
    { name: 'theme-store' }
  )
)

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.add('light')
    root.classList.remove('dark')
  } else {
    root.classList.add('dark')
    root.classList.remove('light')
  }
}

// Apply theme on store hydration
export function initTheme() {
  const stored = localStorage.getItem('theme-store')
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      applyTheme(state.theme ?? 'dark')
    } catch {
      applyTheme('dark')
    }
  } else {
    applyTheme('dark')
  }
}