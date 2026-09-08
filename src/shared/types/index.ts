export type Platform = 'whatsapp' | 'telegram'

export type AccountType = 'personal' | 'business' | 'standard'

export interface MessagingAccount {
  id: string
  name: string
  platform: Platform
  type: AccountType
  partition: string
  avatar?: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface AccountSettings {
  notificationsEnabled: boolean
  soundEnabled: boolean
  voiceCallsEnabled: boolean
  videoCallsEnabled: boolean
  zoomFactor: number
  backgroundMode: 'active' | 'suspended'
}

export type ThemeMode = 'system' | 'light' | 'dark'

export type SidebarMode = 'expanded' | 'compact'

export interface GeneralSettings {
  launchAtStartup: boolean
  startMinimized: boolean
  minimizeToTray: boolean
  closeToTray: boolean
  restoreLastActiveAccount: boolean
  restoreOpenedTabs: boolean
}

export interface AppearanceSettings {
  theme: ThemeMode
  sidebarMode: SidebarMode
}

export interface AppSettings {
  general: GeneralSettings
  appearance: AppearanceSettings
}

export interface UiState {
  activeAccountId: string | null
  openedAccountIds: string[]
  sidebarMode: SidebarMode
  settingsOpen: boolean
}

export interface ViewBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface IpcResult<T = void> {
  ok: true
  data: T
}

export interface IpcError {
  ok: false
  error: string
}

export type IpcResponse<T = void> = IpcResult<T> | IpcError

export interface CreateAccountInput {
  name: string
  platform: Platform
  type: AccountType
}

export interface UpdateAccountInput {
  id: string
  name?: string
  type?: AccountType
  avatar?: string
  enabled?: boolean
}

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  notificationsEnabled: true,
  soundEnabled: true,
  voiceCallsEnabled: true,
  videoCallsEnabled: true,
  zoomFactor: 1,
  backgroundMode: 'active'
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  launchAtStartup: false,
  startMinimized: false,
  minimizeToTray: true,
  closeToTray: false,
  restoreLastActiveAccount: true,
  restoreOpenedTabs: true
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'system',
  sidebarMode: 'expanded'
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  general: DEFAULT_GENERAL_SETTINGS,
  appearance: DEFAULT_APPEARANCE_SETTINGS
}

export const DEFAULT_UI_STATE: UiState = {
  activeAccountId: null,
  openedAccountIds: [],
  sidebarMode: 'expanded',
  settingsOpen: false
}
