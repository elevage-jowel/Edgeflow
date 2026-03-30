'use client'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { useUIStore } from '@/lib/stores/uiStore'
import { useTradesSubscription } from '@/lib/hooks/useTrades'

function DashboardContent({ children }: { children: React.ReactNode }) {
  useTradesSubscription()
  const { isMobileSidebarOpen, setMobileSidebar } = useUIStore()

  return (
    <div className="flex h-screen bg-surface-900 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileSidebar(false)} />
          <div className="relative z-10 h-full">
            <Sidebar mobile onClose={() => setMobileSidebar(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardContent>{children}</DashboardContent>
    </AuthGuard>
  )
}
