import type { MessagingAccount } from '@shared/types'

interface TabBarProps {
  accounts: MessagingAccount[]
  openedAccountIds: string[]
  activeAccountId: string | null
  unreadCounts: Record<string, number>
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onAddAccount: () => void
}

export function TabBar({
  accounts,
  openedAccountIds,
  activeAccountId,
  unreadCounts,
  onSelectTab,
  onCloseTab,
  onAddAccount
}: TabBarProps): JSX.Element {
  const openedAccounts = openedAccountIds
    .map((id) => accounts.find((account) => account.id === id))
    .filter((account): account is MessagingAccount => Boolean(account))

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line bg-surface px-2">
      {openedAccounts.map((account) => {
        const isActive = account.id === activeAccountId
        const unreadCount = unreadCounts[account.id] ?? 0
        return (
          <div
            key={account.id}
            className={`group relative flex max-w-[200px] items-center gap-1 rounded-t-md border border-b-0 px-3 py-1.5 text-sm ${
              isActive
                ? 'border-line bg-canvas font-medium text-ink'
                : 'border-transparent bg-transparent text-ink-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <button type="button" className="truncate" onClick={() => onSelectTab(account.id)}>
              {account.name}
              {unreadCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label={`Close ${account.name} tab`}
              className="ml-1 hidden rounded px-1 text-ink-muted hover:bg-zinc-200 group-hover:inline dark:hover:bg-zinc-700"
              onClick={() => onCloseTab(account.id)}
            >
              ×
            </button>
          </div>
        )
      })}
      <button
        type="button"
        title="Add Account"
        onClick={onAddAccount}
        className="ml-1 rounded-md px-2 py-1 text-lg leading-none text-ink-muted hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        +
      </button>
    </div>
  )
}
