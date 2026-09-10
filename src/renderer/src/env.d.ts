import type {
  AccountSettings,
  AppSettings,
  CreateAccountInput,
  IpcResponse,
  MessagingAccount,
  UiState,
  UpdateAccountInput,
  ViewBounds
} from '@shared/types'

export interface MmwaApi {
  accounts: {
    list: () => Promise<IpcResponse<MessagingAccount[]>>
    create: (input: CreateAccountInput) => Promise<IpcResponse<MessagingAccount>>
    update: (input: UpdateAccountInput) => Promise<IpcResponse<MessagingAccount>>
    delete: (id: string) => Promise<IpcResponse<void>>
    getSettings: (id: string) => Promise<IpcResponse<AccountSettings>>
    setSettings: (accountId: string, settings: AccountSettings) => Promise<IpcResponse<void>>
  }
  views: {
    switch: (accountId: string | null) => Promise<IpcResponse<void>>
    setOverlay: (active: boolean, accountId?: string | null) => Promise<IpcResponse<void>>
    reload: (accountId: string) => Promise<IpcResponse<void>>
    clearSession: (accountId: string) => Promise<IpcResponse<void>>
    resize: (bounds: ViewBounds) => Promise<IpcResponse<void>>
  }
  settings: {
    get: () => Promise<IpcResponse<AppSettings>>
    set: (settings: AppSettings) => Promise<IpcResponse<void>>
  }
  uiState: {
    get: () => Promise<IpcResponse<UiState>>
    set: (state: UiState) => Promise<IpcResponse<void>>
  }
  app: {
    openDevTools: () => Promise<IpcResponse<void>>
    openExternal: (url: string) => Promise<IpcResponse<void>>
    onWindowResized: (callback: () => void) => () => void
    onUnreadChanged: (callback: (payload: { accountId: string; unreadCount: number }) => void) => () => void
    onOpenAccount: (callback: (payload: { accountId: string; chatLabel?: string | null }) => void) => () => void
  }
}

declare global {
  interface Window {
    mmwa: MmwaApi
  }
}

export {}
