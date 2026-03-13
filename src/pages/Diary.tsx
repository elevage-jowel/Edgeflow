import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, NotebookPen } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useStore } from '../store/useStore'
import { useI18n } from '../i18n'
import { Header } from '../components/Layout/Header'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import type { JournalEntry, MoodLevel } from '../types'

const MOODS: { level: MoodLevel; emoji: string; key: string }[] = [
  { level: 1, emoji: '😞', key: 'diary.mood_1' },
  { level: 2, emoji: '😕', key: 'diary.mood_2' },
  { level: 3, emoji: '😐', key: 'diary.mood_3' },
  { level: 4, emoji: '🙂', key: 'diary.mood_4' },
  { level: 5, emoji: '😄', key: 'diary.mood_5' },
]

interface EntryFormState {
  date: string
  title: string
  content: string
  mood: MoodLevel
  goals: string
  lessons: string
}

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM: EntryFormState = {
  date: today(), title: '', content: '', mood: 3, goals: '', lessons: '',
}

function MoodPicker({ value, onChange }: { value: MoodLevel; onChange: (v: MoodLevel) => void }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">{t('diary.mood')}</label>
      <div className="flex items-center gap-2">
        {MOODS.map(m => (
          <button
            key={m.level}
            type="button"
            onClick={() => onChange(m.level)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all ${
              value === m.level
                ? 'bg-brand-500/10 border-brand-500/30 scale-105'
                : 'bg-surface-800 border-surface-600 hover:border-surface-500'
            }`}
          >
            <span className="text-xl">{m.emoji}</span>
            <span className="text-xs text-surface-400">{t(m.key)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function MoodDot({ level }: { level: MoodLevel }) {
  const colors: Record<MoodLevel, string> = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-amber-400',
    4: 'bg-brand-400',
    5: 'bg-emerald-400',
  }
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[level]}`} />
}

function EntryFormComponent({
  initial,
  onSave,
  onClose,
}: {
  initial: EntryFormState
  onSave: (f: EntryFormState) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<EntryFormState>(initial)
  const set = <K extends keyof EntryFormState>(k: K, v: EntryFormState[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label={t('diary.date')} type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        <Input label={t('diary.title_field')} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Today's mindset..." />
      </div>

      <MoodPicker value={form.mood} onChange={v => set('mood', v)} />

      <Textarea
        label={t('diary.content')}
        value={form.content}
        onChange={e => set('content', e.target.value)}
        rows={5}
        placeholder="What happened today? How did you trade? What did you feel?"
        required
      />

      <Textarea
        label={t('diary.goals')}
        value={form.goals}
        onChange={e => set('goals', e.target.value)}
        rows={2}
        placeholder="My goals for today / tomorrow..."
      />

      <Textarea
        label={t('diary.lessons')}
        value={form.lessons}
        onChange={e => set('lessons', e.target.value)}
        rows={2}
        placeholder="Key takeaways and lessons..."
      />

      <div className="flex justify-end gap-3 pt-2 border-t border-surface-700">
        <Button type="button" variant="ghost" onClick={onClose}>{t('journal.cancel')}</Button>
        <Button type="submit">{t('diary.save')}</Button>
      </div>
    </form>
  )
}

export function Diary() {
  const { t } = useI18n()
  const { journalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry } = useStore()

  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...journalEntries].sort((a, b) => b.date.localeCompare(a.date)),
    [journalEntries]
  )

  const handleSave = async (form: EntryFormState) => {
    const data = {
      date: form.date,
      title: form.title || undefined,
      content: form.content,
      mood: form.mood,
      goals: form.goals || undefined,
      lessons: form.lessons || undefined,
    }

    if (editingEntry) {
      await updateJournalEntry(editingEntry.id, data)
    } else {
      await addJournalEntry(data)
    }
    setShowModal(false)
    setEditingEntry(null)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this entry?')) {
      await deleteJournalEntry(id)
      if (expandedId === id) setExpandedId(null)
    }
  }

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry)
    setShowModal(true)
  }

  const moodInfo = (level: MoodLevel) => MOODS.find(m => m.level === level)!

  return (
    <div>
      <Header
        title={t('diary.title')}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => { setEditingEntry(null); setShowModal(true) }}>
            {t('diary.new_entry')}
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 bg-surface-800 rounded-2xl flex items-center justify-center mb-4">
            <NotebookPen size={28} className="text-brand-400" />
          </div>
          <p className="text-surface-400 text-sm max-w-xs">{t('diary.no_entries')}</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sorted.map((entry, i) => {
              const mood = moodInfo(entry.mood)
              const isExpanded = expandedId === entry.id

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-surface-850 border border-surface-700 rounded-xl overflow-hidden hover:border-surface-600 transition-colors"
                >
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div className="text-2xl">{mood.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-white">{entry.date}</span>
                        <MoodDot level={entry.mood} />
                        {entry.title && (
                          <span className="text-sm text-surface-300 truncate">— {entry.title}</span>
                        )}
                      </div>
                      <p className="text-xs text-surface-500 mt-0.5 line-clamp-1">{entry.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleEdit(entry) }}
                        className="p-1.5 rounded-md hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(entry.id) }}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-surface-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-surface-700 pt-4 space-y-3">
                          <div>
                            <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">{t('diary.content')}</p>
                            <p className="text-sm text-surface-300 whitespace-pre-wrap">{entry.content}</p>
                          </div>
                          {entry.goals && (
                            <div>
                              <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">{t('diary.goals')}</p>
                              <p className="text-sm text-surface-300 whitespace-pre-wrap">{entry.goals}</p>
                            </div>
                          )}
                          {entry.lessons && (
                            <div>
                              <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">{t('diary.lessons')}</p>
                              <p className="text-sm text-brand-300 whitespace-pre-wrap">{entry.lessons}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingEntry(null) }}
        title={editingEntry ? t('diary.edit_entry') : t('diary.new_entry')}
        maxWidth="max-w-2xl"
      >
        <EntryFormComponent
          key={editingEntry?.id ?? 'new'}
          initial={editingEntry
            ? {
                date: editingEntry.date,
                title: editingEntry.title ?? '',
                content: editingEntry.content,
                mood: editingEntry.mood,
                goals: editingEntry.goals ?? '',
                lessons: editingEntry.lessons ?? '',
              }
            : EMPTY_FORM
          }
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingEntry(null) }}
        />
      </Modal>
    </div>
  )
}
