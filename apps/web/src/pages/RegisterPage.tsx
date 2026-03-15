import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuthStore } from '../stores/useAuthStore'
import toast from 'react-hot-toast'

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/register', form)
      localStorage.setItem('auth-token', data.token)
      setAuth(data.token, data.user)
      navigate('/')
    } catch {
      toast.error('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-surface p-8 rounded-lg w-full max-w-sm space-y-4">
        <h1 className="text-white text-2xl font-bold text-center">Create Account</h1>
        {(['name', 'email', 'password'] as const).map(field => (
          <input
            key={field}
            type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={form[field]}
            onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
            className="w-full bg-surface-2 text-white px-4 py-2 rounded border border-surface-3 focus:outline-none focus:border-accent"
          />
        ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent/90 text-white py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Register'}
        </button>
        <p className="text-gray-400 text-center text-sm">
          Have an account? <a href="/login" className="text-accent">Login</a>
        </p>
      </form>
    </div>
  )
}