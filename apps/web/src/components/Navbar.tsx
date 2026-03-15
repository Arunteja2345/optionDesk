import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { AddBalanceModal } from './Balance/AddBalanceModal'

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, token, setAuth, logout } = useAuthStore()
  const [showBalanceModal, setShowBalanceModal] = useState(false)

  function handleLogout() {
    logout()
    localStorage.removeItem('auth-token')
    navigate('/login')
  }

  const links = [
    { to: '/', label: 'Option Chain' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/orders', label: 'Orders' },
  ]

  return (
    <>
      <div className="flex items-center gap-1 px-4 py-2 border-b border-surface-3 bg-surface">
        <span className="text-accent font-bold text-sm mr-3">OptionDesk</span>

        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              location.pathname === link.to
                ? 'bg-accent/20 text-accent'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        ))}

        <div className="ml-auto flex items-center gap-3">

          {/* Balance display + Add button */}
          <div className="flex items-center gap-1.5">
            <div className="text-right">
              <p className="text-[10px] text-gray-500 leading-none mb-0.5">Balance</p>
              <p className="text-xs text-white font-mono font-semibold">
                ₹{Number(user?.balance ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <button
              onClick={() => setShowBalanceModal(true)}
              className="px-2 py-1 rounded bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent text-xs font-semibold transition-colors"
              title="Add balance"
            >
              + Add
            </button>
          </div>

          <span className="text-xs text-gray-500">{user?.name}</span>

          <button
            onClick={handleLogout}
            className="px-2 py-1 rounded bg-surface-2 text-gray-400 hover:text-white text-xs border border-surface-3"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Balance Modal */}
      {showBalanceModal && (
        <AddBalanceModal
          currentBalance={Number(user?.balance ?? 0)}
          onClose={() => setShowBalanceModal(false)}
          onSuccess={(newBalance) => {
            if (user && token) {
              setAuth(token, { ...user, balance: newBalance })
            }
          }}
        />
      )}
    </>
  )
}