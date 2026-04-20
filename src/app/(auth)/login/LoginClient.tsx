'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn, signInWithGoogle } from '@/lib/firebase/auth'
import toast from 'react-hot-toast'
import { Eye, EyeOff, TrendingUp, BarChart2, Target, BookOpen } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court (6 caractères minimum)'),
})
type FormData = z.infer<typeof schema>

const features = [
  { icon: BookOpen,   title: 'Journal intelligent',   desc: 'Grade, émotions, screenshots — chaque trade capturé en détail' },
  { icon: BarChart2,  title: 'Analytiques profondes', desc: 'Sharpe, drawdown, heatmap horaire, performance par grade'       },
  { icon: Target,     title: 'Objectifs & discipline', desc: 'Fixe tes cibles, suis ta progression en temps réel'            },
  { icon: TrendingUp, title: 'Playbooks & Backtest',  desc: 'Documente tes setups et valide-les sur l\'historique'           },
]

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
    } catch {
      toast.error('Email ou mot de passe incorrect')
    }
  }

  const handleGoogle = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      router.push('/dashboard')
    } catch {
      toast.error('Connexion Google échouée')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="flex w-full min-h-screen">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-14 relative overflow-hidden bg-surface-900">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-surface-900 to-surface-900" />
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-brand-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-violet-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-px h-3/4 -translate-y-1/2 bg-gradient-to-b from-transparent via-brand-500/20 to-transparent" />

        <div className="relative z-10">
          <Logo size={36} textClassName="text-lg" />
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-3 py-1 mb-5">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
              <span className="text-xs text-brand-300 font-medium">Journal de trading professionnel</span>
            </div>
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
              Ton edge.<br />
              <span className="bg-gradient-to-r from-brand-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Analysé.
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed mt-4 max-w-sm">
              Stop aux intuitions. Chaque trade, chaque émotion, chaque erreur — capturés, analysés, transformés en discipline.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-surface-800/60 rounded-xl p-4 border border-surface-500/40 hover:border-brand-500/30 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center mb-3 group-hover:bg-brand-500/25 transition-colors">
                  <Icon className="w-4 h-4 text-brand-400" />
                </div>
                <div className="text-xs font-semibold text-white mb-1">{title}</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-600">
          <span className="w-4 h-px bg-surface-600" />
          Conçu pour les traders sérieux
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-900">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <Logo size={32} textClassName="text-lg" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1.5">Bon retour 👋</h2>
            <p className="text-slate-500 text-sm">Connecte-toi à ton journal de trading</p>
          </div>

          <button
            onClick={handleGoogle}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-700 hover:bg-surface-600 border border-surface-500 hover:border-surface-400 rounded-xl text-sm font-medium text-white transition-all mb-5 disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {isGoogleLoading ? 'Connexion...' : 'Continuer avec Google'}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-surface-600" />
            <span className="text-xs text-slate-600 font-medium">ou</span>
            <div className="flex-1 h-px bg-surface-600" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wide">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="toi@exemple.com"
                className="w-full px-4 py-3 bg-surface-700 border border-surface-500 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Mot de passe</label>
                <Link href="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-surface-700 border border-surface-500 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm pr-11"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-sm shadow-glow-purple mt-2"
            >
              {isSubmitting ? 'Connexion en cours...' : 'Se connecter →'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Pas encore de compte ?{' '}
            <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
              Créer un compte gratuit
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
