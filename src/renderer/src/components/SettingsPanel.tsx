import { useEffect, useState } from 'react'
import type {
  AccountSettings,
  AppSettings,
  MessagingAccount,
  ThemeMode
} from '@shared/types'

type SettingsSection = 'general' | 'appearance' | 'accounts' | 'advanced'

interface SettingsPanelProps {
  settings: AppSettings
  accounts: MessagingAccount[]
  onClose: () => void
  onSaveSettings: (settings: AppSettings) => Promise<void>
  onUpdateAccount: (id: string, name: string) => Promise<void>
  onDeleteAccount: (id: string) => Promise<void>
  onReloadAccount: (id: string) => Promise<void>
  onClearSession: (id: string) => Promise<void>
  getAccountSettings: (id: string) => Promise<AccountSettings>
  setAccountSettings: (id: string, settings: AccountSettings) => Promise<void>
}

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'advanced', label: 'Advanced' }
]

export function SettingsPanel({
  settings,
  accounts,
  onClose,
  onSaveSettings,
  onUpdateAccount,
  onDeleteAccount,
  onReloadAccount,
  onClearSession,
  getAccountSettings,
  setAccountSettings
}: SettingsPanelProps): JSX.Element {
  const [section, setSection] = useState<SettingsSection>('general')
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(accounts[0]?.id ?? null)
  const [accountSettingsDraft, setAccountSettingsDraft] = useState<AccountSettings | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  useEffect(() => {
    if (!selectedAccountId) {
      setAccountSettingsDraft(null)
      return
    }

    const account = accounts.find((item) => item.id === selectedAccountId)
    setRenameValue(account?.name ?? '')

    void getAccountSettings(selectedAccountId).then(setAccountSettingsDraft)
  }, [accounts, getAccountSettings, selectedAccountId])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setMessage(null)
    try {
      await onSaveSettings(draft)
      if (selectedAccountId && accountSettingsDraft) {
        await setAccountSettings(selectedAccountId, accountSettingsDraft)
      }
      setMessage('Save Changes applied.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Delete Account? This will log out and remove the account permanently.')) {
      return
    }
    await onDeleteAccount(id)
    setSelectedAccountId(accounts.find((a) => a.id !== id)?.id ?? null)
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-ink-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <nav className="w-44 shrink-0 border-r border-line p-3">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${
                section === item.id
                  ? 'bg-zinc-100 font-medium text-ink dark:bg-zinc-800'
                  : 'text-ink-secondary hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          {section === 'general' && (
            <div className="max-w-lg space-y-4">
              <h2 className="text-lg font-medium text-ink">General</h2>
              {(
                [
                  ['launchAtStartup', 'Launch at startup'],
                  ['startMinimized', 'Start minimized'],
                  ['minimizeToTray', 'Minimize to tray'],
                  ['closeToTray', 'Close to tray'],
                  ['restoreLastActiveAccount', 'Restore last active account'],
                  ['restoreOpenedTabs', 'Restore opened tabs']
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={draft.general[key]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        general: { ...draft.general, [key]: e.target.checked }
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          )}

          {section === 'appearance' && (
            <div className="max-w-lg space-y-4">
              <h2 className="text-lg font-medium text-ink">Appearance</h2>
              <label className="block text-sm text-ink">
                Theme
                <select
                  value={draft.appearance.theme}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      appearance: { ...draft.appearance, theme: e.target.value as ThemeMode }
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2"
                >
                  <option value="system">System theme</option>
                  <option value="light">Light theme</option>
                  <option value="dark">Dark theme</option>
                </select>
              </label>
              <label className="block text-sm text-ink">
                Sidebar
                <select
                  value={draft.appearance.sidebarMode}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      appearance: {
                        ...draft.appearance,
                        sidebarMode: e.target.value as AppSettings['appearance']['sidebarMode']
                      }
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2"
                >
                  <option value="expanded">Expanded sidebar</option>
                  <option value="compact">Compact sidebar</option>
                </select>
              </label>
            </div>
          )}

          {section === 'accounts' && (
            <div className="max-w-xl space-y-4">
              <h2 className="text-lg font-medium text-ink">Accounts</h2>
              {accounts.length === 0 ? (
                <p className="text-sm text-ink-secondary">No accounts yet. Use Add Account from the sidebar.</p>
              ) : (
                <>
                  <label className="block text-sm text-ink">
                    Select account
                    <select
                      value={selectedAccountId ?? ''}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2"
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedAccountId && accountSettingsDraft && (
                    <div className="space-y-3 rounded-lg border border-line p-4">
                      <h3 className="font-medium text-ink">Account Settings</h3>
                      <label className="block text-sm text-ink">
                        Account Name
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => void onUpdateAccount(selectedAccountId, renameValue)}
                          className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={accountSettingsDraft.notificationsEnabled}
                          onChange={(e) =>
                            setAccountSettingsDraft({
                              ...accountSettingsDraft,
                              notificationsEnabled: e.target.checked
                            })
                          }
                        />
                        Notifications
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={accountSettingsDraft.soundEnabled}
                          onChange={(e) =>
                            setAccountSettingsDraft({
                              ...accountSettingsDraft,
                              soundEnabled: e.target.checked
                            })
                          }
                        />
                        Sound
                      </label>
                      <label className="block text-sm text-ink">
                        Zoom factor
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={accountSettingsDraft.zoomFactor}
                          onChange={(e) =>
                            setAccountSettingsDraft({
                              ...accountSettingsDraft,
                              zoomFactor: Number(e.target.value)
                            })
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => void onReloadAccount(selectedAccountId)}
                          className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                          Reload WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => void onClearSession(selectedAccountId)}
                          className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                          Logout
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(selectedAccountId)}
                          className="rounded-lg border border-danger px-3 py-1.5 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {section === 'advanced' && (
            <div className="max-w-lg space-y-4">
              <h2 className="text-lg font-medium text-ink">Advanced</h2>
              <p className="text-sm text-ink-secondary">
                Development tools and reset options. Session data is managed by Electron and stored in your user
                profile, not in this project folder.
              </p>
              <button
                type="button"
                onClick={() => void window.mmwa.app.openDevTools()}
                className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Open DevTools in development mode
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset application settings to defaults?')) {
                    void onSaveSettings({
                      general: {
                        launchAtStartup: false,
                        startMinimized: false,
                        minimizeToTray: true,
                        closeToTray: false,
                        restoreLastActiveAccount: true,
                        restoreOpenedTabs: true
                      },
                      appearance: { theme: 'system', sidebarMode: 'expanded' }
                    })
                  }
                }}
                className="block rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Reset application settings
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line px-6 py-3">
        {message && <span className="text-sm text-ink-secondary">{message}</span>}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-ink-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
