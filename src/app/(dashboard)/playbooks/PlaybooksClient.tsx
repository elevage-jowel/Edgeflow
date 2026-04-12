'use client'
import { useState } from 'react'
import { usePlaybooks } from '@/lib/hooks/usePlaybooks'
import { Playbook } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils/cn'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Plus, BookMarked, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  marketCondition: z.string().optional(),
  entryCriteria: z.string().optional(),
  invalidationCriteria: z.string().optional(),
  managementRules: z.string().optional(),
  exitCriteria: z.string().optional(),
  tags: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function PlaybookCard({ playbook, onDelete }: { playbook: Playbook; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden hover:border-surface-400 transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-white">{playbook.name}</h3>
              {playbook.isActive && <Badge variant="brand">Active</Badge>}
            </div>
            {playbook.description && <p className="text-xs text-slate-500 leading-relaxed">{playbook.description}</p>}
          </div>
          <button onClick={onDelete} className="w-7 h-7 rounded text-slate-600 hover:text-red-400 flex items-center justify-center transition-all ml-2">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stats row */}
        {(playbook.tradeCount || playbook.winRate || playbook.avgRMultiple) && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {playbook.tradeCount !== undefined && (
              <div className="bg-surface-700/60 rounded-lg px-3 py-2 text-center">
                <div className="text-sm font-bold font-mono text-white">{playbook.tradeCount}</div>
                <div className="text-xs text-slate-500">Trades</div>
              </div>
            )}
            {playbook.winRate !== undefined && (
              <div className="bg-surface-700/60 rounded-lg px-3 py-2 text-center">
                <div className={cn('text-sm font-bold font-mono', playbook.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>
                  {playbook.winRate.toFixed(0)}%
                </div>
                <div className="text-xs text-slate-500">Taux de réussite</div>
              </div>
            )}
            {playbook.avgRMultiple !== undefined && (
              <div className="bg-surface-700/60 rounded-lg px-3 py-2 text-center">
                <div className={cn('text-sm font-bold font-mono', playbook.avgRMultiple >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {playbook.avgRMultiple >= 0 ? '+' : ''}{playbook.avgRMultiple.toFixed(2)}R
                </div>
                <div className="text-xs text-slate-500">R moyen</div>
              </div>
            )}
          </div>
        )}

        {(playbook.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {(playbook.tags ?? []).map(t => <Badge key={t} variant="default" className="text-xs">{t}</Badge>)}
          </div>
        )}

        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Masquer les détails' : 'Afficher les détails'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-surface-500 p-5 space-y-4">
          {[
            { label: 'Condition de marché', value: playbook.marketCondition },
            { label: 'Critères d\'entrée', value: playbook.entryCriteria },
            { label: 'Invalidation', value: playbook.invalidationCriteria },
            { label: 'Règles de gestion', value: playbook.managementRules },
            { label: 'Critères de sortie', value: playbook.exitCriteria },
          ].filter(s => s.value).map(s => (
            <div key={s.label}>
              <div className="text-xs font-medium text-brand-400 mb-1">{s.label}</div>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{s.value}</p>
            </div>
          ))}

          {(playbook.checklist ?? []).length > 0 && (
            <div>
              <div className="text-xs font-medium text-brand-400 mb-2">Checklist pré-trade</div>
              <div className="space-y-1.5">
                {(playbook.checklist ?? []).map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-4 h-4 border border-surface-400 rounded flex items-center justify-center">
                      {item.checked && <div className="w-2 h-2 bg-brand-500 rounded-sm" />}
                    </div>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PlaybooksClient() {
  const { playbooks, isLoading, createPlaybook, deletePlaybook } = usePlaybooks()
  const [isOpen, setIsOpen] = useState(false)

  const { register, handleSubmit, formState: { isSubmitting }, reset } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      await createPlaybook({
        ...data,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        checklist: [],
        isActive: true,
      })
      toast.success('Playbook créé')
      setIsOpen(false)
      reset()
    } catch {
      toast.error('Échec de la création du playbook')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce playbook ?')) return
    try { await deletePlaybook(id); toast.success('Supprimé') } catch { toast.error('Échec') }
  }

  const inputCls = "w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
  const textareaCls = `${inputCls} resize-none`

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Playbooks de trading</h2>
          <p className="text-sm text-slate-500">Documente tes setups éprouvés et lie-les à tes trades</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsOpen(true)}>Nouveau playbook</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 bg-surface-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : playbooks.length === 0 ? (
        <EmptyState icon={BookMarked} title="Aucun playbook pour l'instant" description="Documente tes meilleurs setups de trading pour analyser leurs performances." action={{ label: 'Créer un playbook', onClick: () => setIsOpen(true) }} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {playbooks.map(pb => <PlaybookCard key={pb.id} playbook={pb} onDelete={() => handleDelete(pb.id)} />)}
        </div>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Créer un playbook" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Nom du playbook *</label>
            <input {...register('name')} placeholder="ex. Momentum Breakout" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Description</label>
            <input {...register('description')} placeholder="Brève description du setup" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Condition de marché</label>
            <textarea {...register('marketCondition')} rows={2} placeholder="Quand est-ce que ça fonctionne le mieux ?" className={textareaCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Critères d&apos;entrée</label>
            <textarea {...register('entryCriteria')} rows={3} placeholder="Lister les conditions d'entrée..." className={textareaCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Invalidation</label>
            <textarea {...register('invalidationCriteria')} rows={2} placeholder="Quand le setup est-il invalide ?" className={textareaCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Critères de sortie</label>
            <textarea {...register('exitCriteria')} rows={2} placeholder="Comment tu sors ?" className={textareaCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Tags (séparés par des virgules)</label>
            <input {...register('tags')} placeholder="momentum, breakout, intraday" className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Annuler</Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>Créer le playbook</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
