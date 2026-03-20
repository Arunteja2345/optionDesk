import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { OptionChainPage } from './pages/OptionChainPage'
import { PortfolioPage } from './pages/PortflioPage'
import { OrderPage } from './pages/OrderPage'
import { LoginPage } from './pages/LoginPage'
import { useAuthStore } from './stores/useAuthStore'

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedLayout><OptionChainPage /></ProtectedLayout>
        } />
        <Route path="/portfolio" element={
          <ProtectedLayout><PortfolioPage /></ProtectedLayout>
        } />
        <Route path="/orders" element={
          <ProtectedLayout><OrderPage /></ProtectedLayout>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}