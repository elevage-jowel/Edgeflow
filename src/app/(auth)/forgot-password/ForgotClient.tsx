'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPassword } from '@/lib/firebase/auth'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const schema = z.object({ email: z.string().email('Valid email required') })
type FormData = z.infer<typeof schema>

export default function ForgotClient() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      await resetPassword(data.email)
      setSent(true)
    } catch {
      toast.error('Failed to send reset email')
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <Logo size={40} textClassName="text-xl" />
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Check your email</h2>
            <p className="text-slate-400 mb-8">We&apos;ve sent a password reset link to your email address.</p>
            <Link href="/login" className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <Link href="/login" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
            <h2 className="text-2xl font-bold text-white mb-2">Reset your password</h2>
            <p className="text-slate-400 mb-8">Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Email</label>
                <input {...register('email')} type="email" placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-surface-700 border border-surface-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm" />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <button type="submit" disabled={isSubmitting}
                className="w-full py-3 px-4 gradient-brand text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 text-sm">
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
