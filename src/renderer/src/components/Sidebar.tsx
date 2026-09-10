import { APP_NAME, APP_VERSION_LABEL } from '@shared/constants/app'
import type { MessagingAccount, SidebarMode } from '@shared/types'
import { PlatformIcon } from './PlatformIcon'

interface SidebarProps {
  accounts: MessagingAccount[]
  activeAccountId: string | null
  sidebarMode: SidebarMode
  unreadCounts: Record<string, number>
  onSelectAccount: (id: string) => void
  onAddAccount: () => void
  onOpenSettings: () => void
  onToggleSidebar: () => void
}

function SidebarToggleButton({
  isCompact,
  onToggle
}: {
  isCompact: boolean
  onToggle: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isCompact ? 'Expand sidebar' : 'Compact sidebar'}
      aria-label={isCompact ? 'Expand sidebar' : 'Compact sidebar'}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm text-ink-muted hover:bg-sidebar-hover hover:text-ink-on-dark"
    >
      {isCompact ? '»' : '«'}
    </button>
  )
}

export function Sidebar({
  accounts,
  activeAccountId,
  sidebarMode,
  unreadCounts,
  onSelectAccount,
  onAddAccount,
  onOpenSettings,
  onToggleSidebar
}: SidebarProps): JSX.Element {
  const isCompact = sidebarMode === 'compact'

  return (
    <aside
      className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-zinc-600/25 bg-sidebar text-ink-on-dark ${
        isCompact ? 'w-16' : 'w-56'
      }`}
    >
      {isCompact ? (
        <div className="flex h-12 shrink-0 items-center justify-center border-b border-zinc-800/80">
          <SidebarToggleButton isCompact onToggle={onToggleSidebar} />
        </div>
      ) : (
        <div className="grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_2rem] items-center gap-1 border-b border-zinc-800/80 px-2">
          <span className="truncate text-sm font-semibold tracking-wide">Accounts</span>
          <SidebarToggleButton isCompact={false} onToggle={onToggleSidebar} />
        </div>
      )}

      <nav className={`min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden ${isCompact ? 'px-1 py-2' : 'p-2'}`}>
        {accounts.map((account) => {
          const isActive = account.id === activeAccountId
          const unreadCount = unreadCounts[account.id] ?? 0
          return (
            <button
              key={account.id}
              type="button"
              title={isCompact ? account.name : undefined}
              onClick={() => onSelectAccount(account.id)}
              className={`relative flex w-full min-w-0 items-center rounded-lg py-2 text-left transition-colors ${
                isActive ? 'bg-sidebar-hover ring-1 ring-zinc-600/80' : 'hover:bg-sidebar-hover'
              } ${isCompact ? 'justify-center px-0' : 'gap-2 px-2'}`}
            >
              <PlatformIcon platform={account.platform} size="md" className={isCompact ? 'mx-auto' : ''} />
              {unreadCount > 0 && (
                <span
                  className={`absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white ${
                    isCompact ? 'right-0.5 top-0.5' : 'right-1.5 top-1.5'
                  }`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {!isCompact && (
                <span className="min-w-0 flex-1 overflow-hidden">
                  <span className="block truncate text-sm font-medium">{account.name}</span>
                  <span className="block truncate text-xs capitalize text-ink-muted">
                    {account.platform} · {account.type}
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className={`shrink-0 space-y-1 border-t border-zinc-800/80 ${isCompact ? 'px-1 py-2' : 'p-2'}`}>
        <button
          type="button"
          title={isCompact ? 'Add Account' : undefined}
          onClick={onAddAccount}
          className={`flex w-full items-center rounded-lg py-2 text-sm hover:bg-sidebar-hover ${
            isCompact ? 'justify-center px-0' : 'gap-2 px-2'
          }`}
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-lg leading-none">
            +
          </span>
          {!isCompact && <span className="truncate">Add Account</span>}
        </button>
        <button
          type="button"
          title={isCompact ? 'Settings' : undefined}
          onClick={onOpenSettings}
          className={`flex w-full items-center rounded-lg py-2 text-sm hover:bg-sidebar-hover ${
            isCompact ? 'justify-center px-0' : 'gap-2 px-2'
          }`}
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm">
            ⚙
          </span>
          {!isCompact && <span className="truncate">Settings</span>}
        </button>
      </div>

      <div
        className={`shrink-0 border-t border-zinc-800/80 text-ink-muted ${isCompact ? 'px-1 py-2 text-center' : 'px-2 py-2'}`}
        title={`${APP_NAME} - ${APP_VERSION_LABEL}`}
      >
        {isCompact ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide">Beta</span>
        ) : (
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-[10px] font-medium text-ink-on-dark/80">{APP_NAME}</p>
            <p className="truncate text-[10px]">{APP_VERSION_LABEL}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
