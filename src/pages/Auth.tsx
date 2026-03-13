import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useI18n } from '../i18n'
import { Button } from '../components/ui/Button'
import { isSupabaseConfigured } from '../lib/supabase'

export function Auth() {
  const { t } = useI18n()
  const { login, register, continueOffline, isLoading } = useStore()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        if (!username.trim()) {
          setError('Username is required')
          return
        }
        await register(email, password, username)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    }
  }

  const inputClass = `
    w-full bg-surface-800 border border-surface-600 rounded-lg px-4 py-3 pl-10
    text-sm text-white placeholder-surface-500
    focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50
    transition-colors duration-150
  `

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500/10 border border-brand-500/30 rounded-2xl mb-4">
            <TrendingUp size={28} className="text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold font-mono text-white">
            Edge<span className="text-brand-400">Flow</span>
          </h1>
          <p className="text-surface-400 text-sm mt-1">{t('auth.subtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 shadow-2xl">
          {/* Mode Toggle */}
          <div className="flex bg-surface-800 rounded-lg p-1 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                {m === 'login' ? t('auth.login') : t('auth.register')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  className={inputClass}
                  type="text"
                  placeholder={t('auth.username')}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                className={inputClass}
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                className={inputClass}
                type="password"
                placeholder={t('auth.password')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </motion.div>
            )}

            {!isSupabaseConfigured && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-400">
                  Supabase not configured — data will be stored locally only.
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full justify-center py-3"
              loading={isLoading}
              size="lg"
            >
              {mode === 'login' ? t('auth.login') : t('auth.register')}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-surface-900 text-xs text-surface-500">or</span>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-center"
            onClick={() => continueOffline()}
          >
            {t('auth.offline_mode')}
          </Button>
        </div>

        <p className="text-center text-xs text-surface-600 mt-6">
          EdgeFlow v2.5 · Trading Journal & Backtesting Lab
        </p>
      </motion.div>
    </div>
  )
}
