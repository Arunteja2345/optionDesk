import { useThemeStore } from '../stores/useThemeStore'

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      className="relative w-10 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5"
      style={{
        backgroundColor: isDark ? '#2a2a2a' : '#e0e0e0',
        border: `1px solid ${isDark ? '#3a3a3a' : '#ccc'}`,
      }}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
    >
      {/* Track icons */}
      <span className="absolute left-1 text-[9px] select-none">
        {isDark ? '🌙' : ''}
      </span>
      <span className="absolute right-1 text-[9px] select-none">
        {!isDark ? '☀️' : ''}
      </span>

      {/* Thumb */}
      <span
        className="w-4 h-4 rounded-full shadow transition-transform duration-200 flex items-center justify-center text-[9px]"
        style={{
          backgroundColor: isDark ? '#387ED1' : '#387ED1',
          transform: isDark ? 'translateX(0)' : 'translateX(20px)',
        }}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}