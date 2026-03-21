import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'

export function HomePage() {
  const { token } = useAuthStore()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-black">O</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">OptionDesk</span>
        </div>

        <div className="flex items-center gap-3">
          {token ? (
            <Link
              to="/app"
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Open App →
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-gray-300 hover:text-white text-sm font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Get started free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 pt-20">

        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-buy/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-sell/5 rounded-full blur-3xl" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs font-medium mb-6">
          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
          Live NSE option chain data
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 max-w-4xl leading-tight">
          Trade options like{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-buy">
            a professional
          </span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          Real-time NIFTY, Bank Nifty and Sensex option chains. Paper trade with live market data.
          Build strategies, track positions, and sharpen your edge — completely free.
        </p>

        {/* CTA buttons */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {token ? (
            <Link
              to="/app"
              className="px-8 py-3.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-base font-semibold transition-all hover:scale-105 shadow-lg shadow-accent/20"
            >
              Open Trading Terminal →
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="px-8 py-3.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-base font-semibold transition-all hover:scale-105 shadow-lg shadow-accent/20"
              >
                Start paper trading free
              </Link>
              <Link
                to="/login"
                className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-base font-semibold transition-colors"
              >
                Log in
              </Link>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8 mt-16 flex-wrap justify-center">
          {[
            { value: '3s', label: 'Data refresh' },
            { value: '₹1L', label: 'Starting balance' },
            { value: '3', label: 'Indices' },
            { value: '100%', label: 'Free forever' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-black text-white font-mono">{stat.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-4">
          Everything you need to trade options
        </h2>
        <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
          Built for serious options traders. Every feature from entry to exit.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '📊',
              title: 'Live Option Chain',
              description: 'Real-time data from NSE for NIFTY, Bank Nifty and Sensex. Greeks, OI, IV and more — updating every 3 seconds.',
            },
            {
              icon: '🧺',
              title: 'Basket Orders',
              description: 'Place multi-leg strategies in one click. Bull spreads, straddles, iron condors — with real margin calculations.',
            },
            {
              icon: '📈',
              title: 'Strategy Builder',
              description: 'Visualize your P&L before you trade. Add legs, see breakeven points and max profit/loss instantly.',
            },
            {
              icon: '💼',
              title: 'Portfolio Tracking',
              description: 'Live unrealized P&L on all open positions. See exactly how your portfolio moves with the market.',
            },
            {
              icon: '⭐',
              title: 'Watchlist',
              description: 'Watch up to 50 contracts with live prices. Expired contracts are removed automatically.',
            },
            {
              icon: '📋',
              title: 'Order History',
              description: 'Complete log of every order with filtering by status, date and contract. Export to CSV.',
            },
          ].map(feature => (
            <div
              key={feature.title}
              className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-white/10 transition-all"
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-16">
            Start trading in 3 steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create account', desc: 'Sign up free. Get ₹1,00,000 paper trading balance instantly.' },
              { step: '02', title: 'Open option chain', desc: 'Browse live NIFTY, Bank Nifty or Sensex option chains with real market data.' },
              { step: '03', title: 'Place your trades', desc: 'Buy, sell or build multi-leg strategies. Track your P&L live.' },
            ].map(step => (
              <div key={step.step} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-black text-lg mb-4 font-mono">
                  {step.step}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-black mb-4">
            Ready to start trading?
          </h2>
          <p className="text-gray-400 mb-8">
            Join traders using OptionDesk to practice and refine their strategies.
          </p>
          {!token && (
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent/90 text-white rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-lg shadow-accent/20"
            >
              Create free account →
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 bg-accent rounded flex items-center justify-center">
            <span className="text-white text-[10px] font-black">O</span>
          </div>
          <span className="text-white font-bold">OptionDesk</span>
        </div>
        <p className="text-gray-600 text-xs">
          Paper trading platform. Not SEBI registered. For educational purposes only.
        </p>
      </footer>
    </div>
  )
}