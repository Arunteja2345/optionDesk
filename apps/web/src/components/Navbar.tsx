import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { useWatchlistStore } from '../stores/useWatchlistStore' // ✅ NEW
import { AddBalanceModal } from './Balance/AddBalanceModal'
import { SearchBar } from './Search/SearchBar' // ✅ NEW

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()

  const { user, token, setAuth, logout } = useAuthStore()
  const { items: watchlistItems } = useWatchlistStore() // ✅ GLOBAL STATE

  const [showBalanceModal, setShowBalanceModal] = useState(false)

  function handleLogout() {
    logout()
    localStorage.removeItem('auth-store')
    navigate('/home') // ✅ consistent with your new flow
  }

  const links = [
    { to: '/', label: 'Option Chain' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/orders', label: 'Orders' },
  ]

  return (
    <>
      <div className="flex items-center gap-1 px-4 py-2 border-b border-surface-3 bg-surface flex-shrink-0">

        {/* Logo */}
        <span className="text-accent font-bold text-sm mr-3">OptionDesk</span>

        {/* Navigation */}
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

        {/* ✅ Search bar */}
        <div className="ml-2 flex-1 max-w-xs">
          <SearchBar />
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">

          {/* ✅ Watchlist Count (GLOBAL) */}
          {watchlistItems.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>★</span>
              <span className="font-mono text-white">
                {watchlistItems.length}
              </span>
            </div>
          )}

          {/* Balance */}
          <div className="flex items-center gap-1.5">
            <div className="text-right">
              <p className="text-[10px] text-gray-500 leading-none mb-0.5">
                Balance
              </p>
              <p className="text-xs text-white font-mono font-semibold">
                ₹{Number(user?.balance ?? 0).toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>

            <button
              onClick={() => setShowBalanceModal(true)}
              className="px-2 py-1 rounded bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent text-xs font-semibold transition-colors"
            >
              + Add
            </button>
          </div>

          {/* User */}
          <span className="text-xs text-gray-500">{user?.name}</span>

          {/* Logout */}
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