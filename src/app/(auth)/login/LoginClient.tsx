'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn, signInWithGoogle } from '@/lib/firebase/auth'
import toast from 'react-hot-toast'
import { Eye, EyeOff, TrendingUp, BarChart2, Target, Zap } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginClient() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await signIn(data.email, data.password)
      router.push('/dashboard')
    } catch (e: any) {
      toast.error(e.message?.includes('user-not-found') || e.message?.includes('wrong-password') ? 'Invalid email or password' : 'Sign in failed. Please try again.')
    }
  }

  const handleGoogle = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      router.push('/dashboard')
    } catch (e: any) {
      toast.error('Google sign in failed')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="flex w-full min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-surface-800">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-surface-800 to-surface-900" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">EdgeFlow</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Your trading edge,<br />
            <span className="text-gradient">deeply analyzed.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
            Journal every trade, track performance with surgical precision, and build the discipline that separates elite traders.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { icon: BarChart2, title: 'Deep Analytics', desc: 'Sharpe, Sortino, equity curves, drawdowns' },
            { icon: Target, title: 'Goal Tracking', desc: 'Set and hit your trading targets' },
            { icon: Zap, title: 'Smart Journal', desc: 'Tag, rate, and review every trade' },
            { icon: TrendingUp, title: 'Playbooks', desc: 'Document and refine your setups' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface-700/60 rounded-xl p-4 border border-surface-500/50">
              <Icon className="w-5 h-5 text-brand-400 mb-2" />
              <div className="text-sm font-semibold text-white mb-1">{title}</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">EdgeFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
          <p className="text-slate-400 mb-8">Sign in to access your trading journal</p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-700 hover:bg-surface-600 border border-surface-500 rounded-xl text-sm font-medium text-white transition-all mb-6 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-surface-500" />
            <span className="text-xs text-slate-500">or</span>
            <div className="flex-1 h-px bg-surface-500" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-surface-700 border border-surface-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-surface-700 border border-surface-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm pr-11"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 gradient-brand text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 text-sm shadow-glow-purple"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Start free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
