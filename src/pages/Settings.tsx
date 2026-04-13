import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Settings as SettingsIcon, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useI18n } from '../i18n'
import { isSupabaseConfigured } from '../lib/supabase'
import { Header } from '../components/Layout/Header'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import type { Currency, AppLanguage } from '../types'

const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD']

export function Settings() {
  const { t, language, setLanguage } = useI18n()
  const { settings, updateSettings, clearAllTrades, user, syncStatus } = useStore()

  const [form, setForm] = useState({
    currency: settings.currency ?? 'USD',
    initial_balance: String(settings.initial_balance ?? 10000),
    risk_per_trade: String(settings.risk_per_trade ?? 1),
    default_risk_reward: String(settings.default_risk_reward ?? 2),
    discord_webhook: settings.discord_webhook ?? '',
    notion_api_key: settings.notion_api_key ?? '',
    notion_database_id: settings.notion_database_id ?? '',
  })

  // Sync integration fields when Zustand finishes hydrating from localStorage
  useEffect(() => {
    setForm(f => ({
      ...f,
      discord_webhook: settings.discord_webhook ?? f.discord_webhook,
      notion_api_key: settings.notion_api_key ?? f.notion_api_key,
      notion_database_id: settings.notion_database_id ?? f.notion_database_id,
    }))
  }, [settings.discord_webhook, settings.notion_api_key, settings.notion_database_id])

  const [saved, setSaved] = useState(false)
  const [cleared, setCleared] = useState(false)

  const handleSave = async () => {
    await updateSettings({
      currency: form.currency as Currency,
      initial_balance: parseFloat(form.initial_balance),
      risk_per_trade: parseFloat(form.risk_per_trade),
      default_risk_reward: parseFloat(form.default_risk_reward),
      language,
      discord_webhook: form.discord_webhook.trim() || undefined,
      notion_api_key: form.notion_api_key.trim() || undefined,
      notion_database_id: form.notion_database_id.trim() || undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleClearTrades = async () => {
    if (window.confirm('Supprimer TOUS les trades ? Cette action est irréversible.')) {
      await clearAllTrades()
      setCleared(true)
      setTimeout(() => setCleared(false), 3000)
    }
  }

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <Header
        title={t('settings.title')}
        actions={
          <Button
            onClick={handleSave}
            icon={saved ? <Check size={16} /> : <SettingsIcon size={16} />}
            variant={saved ? 'secondary' : 'primary'}
          >
            {saved ? t('settings.saved') : t('settings.save')}
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        {/* Account Info */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-850 border border-surface-700 rounded-xl p-5"
          >
            <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Account</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Username</p>
                <p className="font-mono text-white">{user.username}</p>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Email</p>
                <p className="font-mono text-white">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Role</p>
                <p className="font-mono text-white capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Sync Status</p>
                <p className={`font-mono ${
                  syncStatus === 'synced' ? 'text-brand-400' :
                  syncStatus === 'error' ? 'text-red-400' :
                  'text-amber-400'
                }`}>{t(`sync.${syncStatus}`)}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Trading Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-surface-850 border border-surface-700 rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Trading Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('settings.currency')}
              value={form.currency}
              onChange={e => set('currency', e.target.value)}
              options={CURRENCIES.map(c => ({ value: c, label: c }))}
            />
            <Input
              label={t('settings.initial_balance')}
              type="number"
              value={form.initial_balance}
              onChange={e => set('initial_balance', e.target.value)}
              hint="Your starting account balance"
            />
            <Input
              label={t('settings.risk_per_trade')}
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              value={form.risk_per_trade}
              onChange={e => set('risk_per_trade', e.target.value)}
              hint="% of account risked per trade"
            />
            <Input
              label={t('settings.default_rr')}
              type="number"
              step="0.1"
              min="0.1"
              value={form.default_risk_reward}
              onChange={e => set('default_risk_reward', e.target.value)}
              hint="Default risk/reward ratio"
            />
          </div>
        </motion.div>

        {/* App Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-850 border border-surface-700 rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">App Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('settings.language')}
              value={language}
              onChange={e => setLanguage(e.target.value as AppLanguage)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'fr', label: 'Français' },
              ]}
            />
            <Select
              label={t('settings.theme')}
              value="dark"
              onChange={() => {}}
              options={[{ value: 'dark', label: 'Dark (Default)' }]}
            />
          </div>
        </motion.div>

        {/* Integrations */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-surface-850 border border-surface-700 rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-1 uppercase tracking-wider">Integrations</h2>
          <p className="text-xs text-surface-500 mb-4">
            Export trades to Discord &amp; Notion from the journal. Click <strong className="text-white">Save</strong> after filling.
          </p>
          <div className="space-y-4">
            <Input
              label="Discord Webhook URL"
              value={form.discord_webhook}
              onChange={e => set('discord_webhook', e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              hint="Paste your Discord channel webhook URL"
            />
            <Input
              label="Notion API Key"
              value={form.notion_api_key}
              onChange={e => set('notion_api_key', e.target.value)}
              placeholder="secret_..."
              hint="Internal integration token — notion.so/my-integrations"
            />
            <Input
              label="Notion Database ID"
              value={form.notion_database_id}
              onChange={e => set('notion_database_id', e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              hint="ID visible in your Notion database URL"
            />
            {(settings.notion_api_key || settings.discord_webhook) && (
              <div className="flex items-center gap-2 text-xs text-brand-400 pt-1">
                <Check size={12} />
                Integration credentials saved.
              </div>
            )}
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="bg-surface-850 border border-red-500/30 rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-red-400 mb-1 uppercase tracking-wider">Danger Zone</h2>
          <p className="text-xs text-surface-500 mb-4">Ces actions sont permanentes et irréversibles.</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Supprimer tous les trades</p>
              <p className="text-xs text-surface-500">Efface définitivement tous les trades du journal</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={handleClearTrades}
              className="!border-red-500/40 !text-red-400 hover:!bg-red-500/10"
            >
              {cleared ? 'Supprimé !' : 'Tout supprimer'}
            </Button>
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-surface-850 border border-surface-700 rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Data Management</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-white">Export Data</p>
                <p className="text-xs text-surface-500">Download all your trades as JSON</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => {
                const { trades, journalEntries, backtestSessions } = useStore.getState()
                const data = { trades, journalEntries, backtestSessions, exportedAt: new Date().toISOString() }
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `edgeflow-export-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}>
                Export JSON
              </Button>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-surface-700">
              <div>
                <p className="text-sm text-white">Supabase Configuration</p>
                <p className="text-xs text-surface-500">
                  {isSupabaseConfigured
                    ? 'Connected to cloud'
                    : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'}
                </p>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${isSupabaseConfigured ? 'bg-brand-400' : 'bg-amber-400'}`} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
