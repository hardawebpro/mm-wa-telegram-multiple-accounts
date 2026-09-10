import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { AddAccountModal } from './components/AddAccountModal'
import { SettingsPanel } from './components/SettingsPanel'
import { useAppData } from './hooks/useAppData'
import { useContentBounds } from './hooks/useContentBounds'
import { useAppearance } from './hooks/useAppearance'

export default function App(): JSX.Element {
  const {
    accounts,
    settings,
    uiState,
    loading,
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
  } = useAppData()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const shellInteractive = !addModalOpen && !uiState.settingsOpen
  const { contentRef, reportBounds } = useContentBounds(shellInteractive)

  useAppearance(settings.appearance)

  const sidebarMode = uiState.sidebarMode ?? settings.appearance.sidebarMode

  const openAddAccountModal = useCallback(async () => {
    await prepareAddAccountModal()
    setAddModalOpen(true)
  }, [prepareAddAccountModal])

  const closeAddAccountModal = useCallback(async () => {
    setAddModalOpen(false)
    await window.mmwa.views.setOverlay(false, uiState.activeAccountId)
    reportBounds()
  }, [reportBounds, uiState.activeAccountId])

  useEffect(() => {
    const unsubscribeUnread = window.mmwa.app.onUnreadChanged(({ accountId, unreadCount }) => {
      setUnreadCounts((previous) => ({ ...previous, [accountId]: unreadCount }))
    })

    const unsubscribeOpenAccount = window.mmwa.app.onOpenAccount(({ accountId }) => {
      void switchAccount(accountId)
    })

    return () => {
      unsubscribeUnread()
      unsubscribeOpenAccount()
    }
  }, [switchAccount])

  useEffect(() => {
    if (!loading && shellInteractive) {
      reportBounds()
    }
  }, [
    loading,
    shellInteractive,
    uiState.activeAccountId,
    uiState.openedAccountIds,
    sidebarMode,
    reportBounds
  ])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas text-ink-secondary">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" data-app-layout>
      <TabBar
        accounts={accounts}
        openedAccountIds={uiState.openedAccountIds}
        activeAccountId={uiState.activeAccountId}
        unreadCounts={unreadCounts}
        onSelectTab={(id) => void switchAccount(id)}
        onCloseTab={(id) => void closeTab(id)}
        onAddAccount={() => void openAddAccountModal()}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          accounts={accounts}
          activeAccountId={uiState.activeAccountId}
          sidebarMode={sidebarMode}
          unreadCounts={unreadCounts}
          onSelectAccount={(id) => void switchAccount(id)}
          onAddAccount={() => void openAddAccountModal()}
          onOpenSettings={() => void openSettings()}
          onToggleSidebar={() => void toggleSidebarMode()}
        />

        <main className="relative min-w-0 flex-1 bg-canvas">
          {uiState.settingsOpen ? (
            <SettingsPanel
              settings={settings}
              accounts={accounts}
              onClose={() => void closeSettings()}
              onSaveSettings={persistSettings}
              onUpdateAccount={async (id, name) => {
                await updateAccount({ id, name })
              }}
              onDeleteAccount={(id) => deleteAccount(id)}
              onReloadAccount={(id) => reloadAccount(id)}
              onClearSession={(id) => clearAccountSession(id)}
              getAccountSettings={getAccountSettings}
              setAccountSettings={setAccountSettings}
            />
          ) : (
            <>
              <div ref={contentRef} className="absolute inset-0" />
              {uiState.openedAccountIds.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-lg font-medium text-ink">No account open</p>
                  <p className="mt-1 max-w-sm text-sm text-ink-secondary">
                    Click Add Account to create a WhatsApp or Telegram workspace. Each account runs in an isolated
                    session.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AddAccountModal
        open={addModalOpen}
        onClose={() => void closeAddAccountModal()}
        onSubmit={async (input) => {
          const account = await createAccount(input)
          setAddModalOpen(false)
          await window.mmwa.views.setOverlay(false, account.id)
          // Allow layout to settle before reporting bounds for the new active view.
          requestAnimationFrame(() => {
            reportBounds()
          })
        }}
      />
    </div>
  )
}
