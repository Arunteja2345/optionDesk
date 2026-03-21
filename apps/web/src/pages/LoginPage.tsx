import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuthStore } from '../stores/useAuthStore'

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      setAuth(data.token, data.user)
      navigate('/')
    } catch (e: any) {
      setError(e.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">

      {/* Back to home */}
      <Link
        to="/home"
        className="fixed top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
      >
        ← OptionDesk
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-black">O</span>
          </div>
          <span className="text-white font-bold text-xl">OptionDesk</span>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
          <h1 className="text-white font-bold text-2xl mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white/5 border border-white/10 focus:border-accent text-white rounded-xl px-4 py-3 text-sm outline-none placeholder-gray-600 transition-colors"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/5 border border-white/10 focus:border-accent text-white rounded-xl px-4 py-3 text-sm outline-none placeholder-gray-600 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-sell/10 border border-sell/30 rounded-xl px-4 py-3 text-sell text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            No account?{' '}
            <Link to="/register" className="text-accent hover:text-accent/80 font-medium">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}