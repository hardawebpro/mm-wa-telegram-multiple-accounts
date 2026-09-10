import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc/channels'
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

async function invoke<T>(channel: string, payload?: unknown): Promise<IpcResponse<T>> {
  return ipcRenderer.invoke(channel, payload) as Promise<IpcResponse<T>>
}

const mmwaApi = {
  accounts: {
    list: (): Promise<IpcResponse<MessagingAccount[]>> => invoke(IPC_CHANNELS.ACCOUNT_LIST),
    create: (input: CreateAccountInput): Promise<IpcResponse<MessagingAccount>> =>
      invoke(IPC_CHANNELS.ACCOUNT_CREATE, input),
    update: (input: UpdateAccountInput): Promise<IpcResponse<MessagingAccount>> =>
      invoke(IPC_CHANNELS.ACCOUNT_UPDATE, input),
    delete: (id: string): Promise<IpcResponse<void>> => invoke(IPC_CHANNELS.ACCOUNT_DELETE, { id }),
    getSettings: (id: string): Promise<IpcResponse<AccountSettings>> =>
      invoke(IPC_CHANNELS.ACCOUNT_GET_SETTINGS, { id }),
    setSettings: (
      accountId: string,
      settings: AccountSettings
    ): Promise<IpcResponse<void>> => invoke(IPC_CHANNELS.ACCOUNT_SET_SETTINGS, { accountId, settings })
  },
  views: {
    switch: (accountId: string | null): Promise<IpcResponse<void>> =>
      invoke(IPC_CHANNELS.VIEW_SWITCH, { accountId }),
    setOverlay: (
      active: boolean,
      accountId?: string | null
    ): Promise<IpcResponse<void>> => invoke(IPC_CHANNELS.VIEW_SET_OVERLAY, { active, accountId }),
    reload: (accountId: string): Promise<IpcResponse<void>> =>
      invoke(IPC_CHANNELS.VIEW_RELOAD, { id: accountId }),
    clearSession: (accountId: string): Promise<IpcResponse<void>> =>
      invoke(IPC_CHANNELS.VIEW_CLEAR_SESSION, { id: accountId }),
    resize: (bounds: ViewBounds): Promise<IpcResponse<void>> => invoke(IPC_CHANNELS.VIEW_RESIZE, bounds)
  },
  settings: {
    get: (): Promise<IpcResponse<AppSettings>> => invoke(IPC_CHANNELS.SETTINGS_GET),
    set: (settings: AppSettings): Promise<IpcResponse<void>> => invoke(IPC_CHANNELS.SETTINGS_SET, settings)
  },
  uiState: {
    get: (): Promise<IpcResponse<UiState>> => invoke(IPC_CHANNELS.UI_STATE_GET),
    set: (state: UiState): Promise<IpcResponse<void>> => invoke(IPC_CHANNELS.UI_STATE_SET, state)
  },
  app: {
    openDevTools: (): Promise<IpcResponse<void>> => invoke(IPC_CHANNELS.APP_OPEN_DEVTOOLS),
    openExternal: (url: string): Promise<IpcResponse<void>> =>
      invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, { url }),
    onWindowResized: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('window:resized', listener)
      return () => ipcRenderer.removeListener('window:resized', listener)
    },
    onUnreadChanged: (
      callback: (payload: { accountId: string; unreadCount: number }) => void
    ): (() => void) => {
      const listener = (_event: unknown, payload: { accountId: string; unreadCount: number }): void =>
        callback(payload)
      ipcRenderer.on('account:unread-changed', listener)
      return () => ipcRenderer.removeListener('account:unread-changed', listener)
    },
    onOpenAccount: (callback: (payload: { accountId: string; chatLabel?: string | null }) => void): (() => void) => {
      const listener = (_event: unknown, payload: { accountId: string; chatLabel?: string | null }): void =>
        callback(payload)
      ipcRenderer.on('notification:open-account', listener)
      return () => ipcRenderer.removeListener('notification:open-account', listener)
    }
  }
}

contextBridge.exposeInMainWorld('mmwa', mmwaApi)

export type MmwaApi = typeof mmwaApi
