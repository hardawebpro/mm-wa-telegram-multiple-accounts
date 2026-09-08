import { useEffect, useState } from 'react'
import type { AccountType, Platform } from '@shared/types'

interface AddAccountModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: { name: string; platform: Platform; type: AccountType }) => Promise<void>
}

export function AddAccountModal({ open, onClose, onSubmit }: AddAccountModalProps): JSX.Element | null {
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState<Platform>('whatsapp')
  const [type, setType] = useState<AccountType>('personal')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setName('')
    setPlatform('whatsapp')
    setType('personal')
    setSubmitting(false)
    setError(null)
  }, [open])

  if (!open) {
    return null
  }

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Account name is required')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ name: name.trim(), platform, type })
      setName('')
      setPlatform('whatsapp')
      setType('personal')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePlatformChange = (next: Platform): void => {
    setPlatform(next)
    if (next === 'telegram') {
      setType('standard')
    } else if (type === 'standard') {
      setType('personal')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-ink">Add Account</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Enter a display name and select the platform type. You will authenticate in the next step.
        </p>

        <form className="mt-5 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block">
            <span className="text-sm font-medium text-ink">Account Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Personal, Business Jakarta"
              className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-focus focus:ring-2 focus:ring-focus/20"
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink">Platform</span>
            <select
              value={platform}
              onChange={(e) => handlePlatformChange(e.target.value as Platform)}
              className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-focus"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink">Account Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-focus"
            >
              {platform === 'whatsapp' ? (
                <>
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                </>
              ) : (
                <option value="standard">Standard</option>
              )}
            </select>
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-ink-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
