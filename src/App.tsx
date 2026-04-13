import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from './store/useStore'
import { Sidebar } from './components/Layout/Sidebar'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Journal } from './pages/Journal'
import { Backtest } from './pages/Backtest'
import { Diary } from './pages/Diary'
import { Calendar } from './pages/Calendar'
import { Settings } from './pages/Settings'
import { AIMonitor } from './pages/AIMonitor'

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-surface-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <AnimatePresence mode="wait">
            {children}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

export function App() {
  const { isAuthenticated, syncWithCloud } = useStore()

  useEffect(() => {
    if (isAuthenticated) {
      syncWithCloud().catch(() => {})
    }
  }, [isAuthenticated, syncWithCloud])

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/backtest" element={<Backtest />} />
          <Route path="/diary" element={<Diary />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ai-monitor" element={<AIMonitor />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}
