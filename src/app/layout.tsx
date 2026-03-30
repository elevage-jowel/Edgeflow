import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'EdgeFlow — Trading Journal & Analytics',
  description: 'The elite trading journal and performance analytics platform for serious traders.',
  keywords: ['trading journal', 'trade analytics', 'performance tracking', 'prop trading'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface-900 text-slate-100 font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#12141c',
                color: '#f1f5f9',
                border: '1px solid #252a3a',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#12141c' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#12141c' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
