import { APP_NAME, APP_VERSION_LABEL } from '@shared/constants/app'
import type { MessagingAccount, SidebarMode } from '@shared/types'

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

function PlatformIcon({ platform }: { platform: MessagingAccount['platform'] }): JSX.Element {
  const color = platform === 'whatsapp' ? 'bg-brand' : 'bg-brand-telegram'
  const label = platform === 'whatsapp' ? 'WA' : 'TG'
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${color}`}
    >
      {label}
    </span>
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
      className={`flex h-full shrink-0 flex-col bg-sidebar text-ink-on-dark transition-all duration-200 ${
        isCompact ? 'w-16' : 'w-56'
      }`}
    >
      <div className={`flex items-center border-b border-zinc-800 px-3 py-3 ${isCompact ? 'justify-center' : 'justify-between'}`}>
        {!isCompact && <span className="text-sm font-semibold tracking-wide">Accounts</span>}
        <button
          type="button"
          onClick={onToggleSidebar}
          title={isCompact ? 'Expand sidebar' : 'Compact sidebar'}
          className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-sidebar-hover hover:text-ink-on-dark"
        >
          {isCompact ? '»' : '«'}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {accounts.map((account) => {
          const isActive = account.id === activeAccountId
          const unreadCount = unreadCounts[account.id] ?? 0
          return (
            <button
              key={account.id}
              type="button"
              title={isCompact ? account.name : undefined}
              onClick={() => onSelectAccount(account.id)}
              className={`relative flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                isActive ? 'bg-sidebar-hover ring-1 ring-zinc-600' : 'hover:bg-sidebar-hover'
              } ${isCompact ? 'justify-center' : ''}`}
            >
              <PlatformIcon platform={account.platform} />
              {unreadCount > 0 && (
                <span
                  className={`absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white ${
                    isCompact ? 'right-1 top-1' : 'right-2 top-2'
                  }`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {!isCompact && (
                <span className="min-w-0 flex-1">
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

      <div className="space-y-1 border-t border-zinc-800 p-2">
        <button
          type="button"
          title={isCompact ? 'Add Account' : undefined}
          onClick={onAddAccount}
          className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-sidebar-hover ${
            isCompact ? 'justify-center' : ''
          }`}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-lg leading-none">
            +
          </span>
          {!isCompact && <span>Add Account</span>}
        </button>
        <button
          type="button"
          title={isCompact ? 'Settings' : undefined}
          onClick={onOpenSettings}
          className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-sidebar-hover ${
            isCompact ? 'justify-center' : ''
          }`}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-sm">
            ⚙
          </span>
          {!isCompact && <span>Settings</span>}
        </button>
      </div>

      <div
        className={`border-t border-zinc-800 px-3 py-2 text-ink-muted ${isCompact ? 'text-center' : ''}`}
        title={`${APP_NAME} - ${APP_VERSION_LABEL}`}
      >
        {isCompact ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide">Beta</span>
        ) : (
          <>
            <p className="truncate text-[10px] font-medium text-ink-on-dark/80">{APP_NAME}</p>
            <p className="text-[10px]">{APP_VERSION_LABEL}</p>
          </>
        )}
      </div>
    </aside>
  )
}
