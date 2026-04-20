'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signUp, signInWithGoogle } from '@/lib/firebase/auth'
import toast from 'react-hot-toast'
import { Eye, EyeOff, CheckCircle, TrendingUp, BarChart2, Target, Shield } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const schema = z.object({
  name: z.string().min(2, 'Prénom trop court (2 caractères minimum)'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court (8 caractères minimum)'),
})
type FormData = z.infer<typeof schema>

const perks = [
  { icon: TrendingUp,  text: 'Journal de trading illimité'        },
  { icon: BarChart2,   text: 'Analytiques avancées & heatmaps'    },
  { icon: Target,      text: 'Objectifs, playbooks & backtest'     },
  { icon: Shield,      text: 'Import CSV depuis n\'importe quel broker' },
]

export default function SignupClient() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await signUp(data.email, data.password, data.name)
      toast.success('Compte créé ! Chargement des données...')
      router.push('/dashboard')
    } catch (e: any) {
      const msg = e.code === 'auth/email-already-in-use'
        ? 'Cet email est déjà utilisé'
        : 'Erreur lors de la création du compte'
      toast.error(msg)
    }
  }

  const handleGoogle = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      router.push('/dashboard')
    } catch {
      toast.error('Connexion Google échouée')
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="flex w-full min-h-screen">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-14 relative overflow-hidden bg-surface-900">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-surface-900 to-surface-900" />
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-brand-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-px h-3/4 -translate-y-1/2 bg-gradient-to-b from-transparent via-brand-500/20 to-transparent" />

        <div className="relative z-10">
          <Logo size={36} textClassName="text-lg" />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <span className="text-xs text-emerald-300 font-medium">Gratuit — aucune carte requise</span>
            </div>
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
              Construis ton edge.<br />
              <span className="bg-gradient-to-r from-brand-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Trade mieux.
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed mt-4 max-w-sm">
              Rejoins les traders qui utilisent Edgeflow pour analyser leur performance, journaliser avec précision et faire croître leur compte.
            </p>
          </div>

          <ul className="space-y-3">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-brand-400" />
                </div>
                <span className="text-sm text-slate-300">{text}</span>
              </li>
            ))}
          </ul>

          <div className="p-4 bg-surface-800/60 rounded-xl border border-surface-500/40">
            <p className="text-slate-400 text-sm italic leading-relaxed">
              &ldquo;Edgeflow a transformé ma façon de revoir mes trades. Mon taux de réussite a progressé de 18% en 3 mois.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white">
                M
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Marcus K.</div>
                <div className="text-xs text-slate-500">Prop Trader — 6 ans d'expérience</div>
              </div>
            </div>
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
            <h2 className="text-2xl font-bold text-white mb-1.5">Créer un compte gratuit</h2>
            <p className="text-slate-500 text-sm">Commence à journaliser tes trades dès maintenant</p>
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
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wide">Prénom</label>
              <input
                {...register('name')}
                placeholder="Jean Dupont"
                className="w-full px-4 py-3 bg-surface-700 border border-surface-500 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

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
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wide">Mot de passe</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="8 caractères minimum"
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
              {isSubmitting ? 'Création en cours...' : 'Créer mon compte →'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-4">
            En créant un compte tu acceptes nos conditions d'utilisation.
          </p>

          <p className="text-center text-sm text-slate-500 mt-3">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
