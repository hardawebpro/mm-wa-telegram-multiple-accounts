import type { MessagingAccount } from '@shared/types'
import { PlatformIcon } from './PlatformIcon'

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
    <div className="flex h-10 shrink-0 items-end gap-0.5 border-b border-line bg-canvas px-2 dark:bg-zinc-900">
      {openedAccounts.map((account) => {
        const isActive = account.id === activeAccountId
        const unreadCount = unreadCounts[account.id] ?? 0
        return (
          <div
            key={account.id}
            className={`group relative flex max-w-[220px] items-center gap-1 rounded-t-md px-2 py-1.5 text-sm transition-colors ${
              isActive
                ? '-mb-px z-10 border border-line border-b-tab-active bg-tab-active font-medium text-ink'
                : 'border border-transparent bg-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            <button
              type="button"
              className="flex min-w-0 items-center gap-1.5 truncate"
              onClick={() => onSelectTab(account.id)}
            >
              <PlatformIcon platform={account.platform} size="sm" />
              <span className="truncate">{account.name}</span>
              {unreadCount > 0 && (
                <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label={`Close ${account.name} tab`}
              className="ml-0.5 hidden shrink-0 rounded px-1 text-ink-muted hover:bg-zinc-200 group-hover:inline dark:hover:bg-zinc-700"
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
        className="mb-1 ml-1 rounded-md px-2 py-1 text-lg leading-none text-ink-muted hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        +
      </button>
    </div>
  )
}
