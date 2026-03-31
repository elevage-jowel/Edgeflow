'use client'
import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { User, Lock, Globe, Download, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'account', label: 'Account', icon: Lock },
  { id: 'preferences', label: 'Preferences', icon: Globe },
  { id: 'data', label: 'Data', icon: Download },
]

const inputCls = "w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
const labelCls = "text-xs font-medium text-slate-400 mb-1 block"

export default function SettingsClient() {
  const { user, userProfile, setProfile } = useAuthStore()
  const [tab, setTab] = useState('profile')
  const [displayName, setDisplayName] = useState(userProfile?.displayName ?? '')
  const [currency, setCurrency] = useState(userProfile?.currency ?? 'USD')
  const [riskUnit, setRiskUnit] = useState(userProfile?.riskUnit ?? 'dollar')
  const [isSaving, setIsSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const saveProfile = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProfile({ ...userProfile!, displayName: data.name ?? displayName })
      toast.success('Profile updated')
    } catch { toast.error('Failed to save') } finally { setIsSaving(false) }
  }

  const savePreferences = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency, riskUnit }),
      })
      if (!res.ok) throw new Error()
      setProfile({ ...userProfile!, currency, riskUnit })
      toast.success('Preferences saved')
    } catch { toast.error('Failed') } finally { setIsSaving(false) }
  }

  const changePassword = async () => {
    if (!currentPassword || !newPassword) return
    setIsSaving(true)
    try {
      // Verify current password by attempting re-auth, then update
      // This requires a dedicated API endpoint for security; stub for now
      toast.success('Password change requires a dedicated auth flow — coming soon')
    } catch { toast.error('Failed to update password') } finally { setIsSaving(false) }
  }

  const exportData = () => {
    toast('Export functionality coming soon.', { icon: '📦' })
  }

  const initials = (userProfile?.displayName ?? user?.name ?? user?.email ?? 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Settings</h2>
        <p className="text-sm text-slate-500">Manage your account and preferences</p>
      </div>

      <div className="flex gap-1 bg-surface-800 border border-surface-500 rounded-xl p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === id ? 'bg-surface-600 text-white' : 'text-slate-400 hover:text-white')}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="bg-surface-800 border border-surface-500 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full gradient-brand flex items-center justify-center text-xl font-bold text-white">{initials}</div>
            <div>
              <div className="text-base font-bold text-white">{userProfile?.displayName ?? user?.name ?? 'Trader'}</div>
              <div className="text-sm text-slate-500">{user?.email}</div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputCls} placeholder="Your name" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={user?.email ?? ''} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={saveProfile} loading={isSaving}>Save Profile</Button>
          </div>
        </div>
      )}

      {tab === 'account' && (
        <div className="bg-surface-800 border border-surface-500 rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-white">Change Password</h3>
          <div>
            <label className={labelCls}>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
          </div>
          <div>
            <label className={labelCls}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} placeholder="Min. 8 characters" />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={changePassword} loading={isSaving} disabled={!currentPassword || !newPassword}>
              Update Password
            </Button>
          </div>
        </div>
      )}

      {tab === 'preferences' && (
        <div className="bg-surface-800 border border-surface-500 rounded-2xl p-6 space-y-5">
          <div>
            <label className={labelCls}>Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls}>
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Risk Unit</label>
            <select value={riskUnit} onChange={e => setRiskUnit(e.target.value as any)} className={inputCls}>
              <option value="dollar">Dollar Amount ($)</option>
              <option value="percent">Percentage (%)</option>
              <option value="r">R Multiple</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Timezone</label>
            <input value={userProfile?.timezone ?? 'UTC'} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={savePreferences} loading={isSaving}>Save Preferences</Button>
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div className="space-y-4">
          <div className="bg-surface-800 border border-surface-500 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-2">Export Data</h3>
            <p className="text-sm text-slate-500 mb-4">Download all your trades and settings as a CSV or JSON file.</p>
            <Button variant="secondary" icon={Download} onClick={exportData}>Export All Data</Button>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-sm text-slate-500 mb-4">Permanently delete your account and all associated data.</p>
            <Button variant="danger" icon={Trash2} onClick={() => toast.error('Please contact support to delete your account.')}>
              Delete Account
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
