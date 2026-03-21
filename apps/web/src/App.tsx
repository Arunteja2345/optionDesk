import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Navbar } from './components/Navbar'
import { OptionChainPage } from './pages/OptionChainPage'
import { PortfolioPage } from './pages/PortflioPage'
import { OrderPage } from './pages/OrderPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { HomePage } from './pages/HomePage'
import { useAuthStore } from './stores/useAuthStore'
import { OptionDetailPage } from './pages/OptionDetailPage'

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #2a2a2a',
            fontSize: '13px',
          }
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedLayout><OptionChainPage /></ProtectedLayout>
        } />
        <Route path="/portfolio" element={
          <ProtectedLayout><PortfolioPage /></ProtectedLayout>
        } />
        <Route path="/orders" element={
          <ProtectedLayout><OrderPage /></ProtectedLayout>
        } />
        <Route
          path="/option/:indexName/:strikePrice/:optionType/:expiryDate"
          element={<ProtectedLayout><OptionDetailPage /></ProtectedLayout>}
        />

        {/* Redirect root to home if not logged in, app if logged in */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}