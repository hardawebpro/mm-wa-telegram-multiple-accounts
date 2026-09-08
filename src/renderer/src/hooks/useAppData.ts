import { useCallback, useEffect, useState } from 'react'
import type {
  AccountSettings,
  AppSettings,
  CreateAccountInput,
  MessagingAccount,
  UiState,
  UpdateAccountInput
} from '@shared/types'
import { DEFAULT_APP_SETTINGS, DEFAULT_UI_STATE } from '@shared/types'

function unwrap<T>(response: { ok: boolean; data?: T; error?: string }): T {
  if (!response.ok) {
    throw new Error(response.error ?? 'Request failed')
  }
  return response.data as T
}

export function useAppData() {
  const [accounts, setAccounts] = useState<MessagingAccount[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [uiState, setUiState] = useState<UiState>(DEFAULT_UI_STATE)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [accountsRes, settingsRes, uiStateRes] = await Promise.all([
      window.mmwa.accounts.list(),
      window.mmwa.settings.get(),
      window.mmwa.uiState.get()
    ])

    setAccounts(unwrap(accountsRes))
    setSettings(unwrap(settingsRes))
    setUiState(unwrap(uiStateRes))
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const persistUiState = useCallback(async (next: UiState) => {
    setUiState(next)
    await window.mmwa.uiState.set(next)
  }, [])

  const persistSettings = useCallback(async (next: AppSettings) => {
    setSettings(next)
    await window.mmwa.settings.set(next)
  }, [])

  const createAccount = useCallback(
    async (input: CreateAccountInput) => {
      const response = await window.mmwa.accounts.create(input)
      const account = unwrap(response)
      setAccounts((prev) => [...prev, account])

      const nextUi: UiState = {
        ...uiState,
        openedAccountIds: [...uiState.openedAccountIds, account.id],
        activeAccountId: account.id,
        settingsOpen: false
      }
      await persistUiState(nextUi)
      return account
    },
    [persistUiState, uiState]
  )

  const updateAccount = useCallback(async (input: UpdateAccountInput) => {
    const response = await window.mmwa.accounts.update(input)
    const updated = unwrap(response)
    setAccounts((prev) => prev.map((account) => (account.id === updated.id ? updated : account)))
    return updated
  }, [])

  const deleteAccount = useCallback(
    async (id: string) => {
      unwrap(await window.mmwa.accounts.delete(id))
      setAccounts((prev) => prev.filter((account) => account.id !== id))

      const openedAccountIds = uiState.openedAccountIds.filter((accountId) => accountId !== id)
      const activeAccountId =
        uiState.activeAccountId === id ? openedAccountIds[0] ?? null : uiState.activeAccountId

      const nextUi: UiState = { ...uiState, openedAccountIds, activeAccountId }
      await persistUiState(nextUi)

      if (uiState.settingsOpen) {
        await window.mmwa.views.setOverlay(true)
      } else {
        await window.mmwa.views.setOverlay(false, activeAccountId)
      }
    },
    [persistUiState, uiState]
  )

  const prepareAddAccountModal = useCallback(async () => {
    if (uiState.settingsOpen) {
      await persistUiState({ ...uiState, settingsOpen: false })
    }
    await window.mmwa.views.setOverlay(true)
  }, [persistUiState, uiState])

  const switchAccount = useCallback(
    async (accountId: string) => {
      const openedAccountIds = uiState.openedAccountIds.includes(accountId)
        ? uiState.openedAccountIds
        : [...uiState.openedAccountIds, accountId]

      const nextUi: UiState = {
        ...uiState,
        activeAccountId: accountId,
        openedAccountIds,
        settingsOpen: false
      }
      await persistUiState(nextUi)
      await window.mmwa.views.setOverlay(false, accountId)
    },
    [persistUiState, uiState]
  )

  const closeTab = useCallback(
    async (accountId: string) => {
      const openedAccountIds = uiState.openedAccountIds.filter((id) => id !== accountId)
      const activeAccountId =
        uiState.activeAccountId === accountId ? openedAccountIds[0] ?? null : uiState.activeAccountId

      const nextUi: UiState = { ...uiState, openedAccountIds, activeAccountId }
      await persistUiState(nextUi)
      await window.mmwa.views.setOverlay(false, activeAccountId)
    },
    [persistUiState, uiState]
  )

  const openSettings = useCallback(async () => {
    await persistUiState({ ...uiState, settingsOpen: true })
    await window.mmwa.views.setOverlay(true)
  }, [persistUiState, uiState])

  const closeSettings = useCallback(async () => {
    const nextUi: UiState = { ...uiState, settingsOpen: false }
    await persistUiState(nextUi)
    await window.mmwa.views.setOverlay(false, nextUi.activeAccountId)
  }, [persistUiState, uiState])

  const toggleSidebarMode = useCallback(async () => {
    const sidebarMode = uiState.sidebarMode === 'expanded' ? 'compact' : 'expanded'
    const nextUi: UiState = { ...uiState, sidebarMode }
    const nextSettings: AppSettings = {
      ...settings,
      appearance: { ...settings.appearance, sidebarMode }
    }
    await persistUiState(nextUi)
    await persistSettings(nextSettings)
  }, [persistSettings, persistUiState, settings, uiState])

  const reloadAccount = useCallback(async (accountId: string) => {
    unwrap(await window.mmwa.views.reload(accountId))
  }, [])

  const clearAccountSession = useCallback(async (accountId: string) => {
    unwrap(await window.mmwa.views.clearSession(accountId))
  }, [])

  const getAccountSettings = useCallback(async (accountId: string): Promise<AccountSettings> => {
    return unwrap(await window.mmwa.accounts.getSettings(accountId))
  }, [])

  const setAccountSettings = useCallback(async (accountId: string, accountSettings: AccountSettings) => {
    unwrap(await window.mmwa.accounts.setSettings(accountId, accountSettings))
  }, [])

  return {
    accounts,
    settings,
    uiState,
    loading,
    refresh,
    createAccount,
    updateAccount,
    deleteAccount,
    prepareAddAccountModal,
    switchAccount,
    closeTab,
    openSettings,
    closeSettings,
    toggleSidebarMode,
    persistSettings,
    reloadAccount,
    clearAccountSession,
    getAccountSettings,
    setAccountSettings
  }
}
