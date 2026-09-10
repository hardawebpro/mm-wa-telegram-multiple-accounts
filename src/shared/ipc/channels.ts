export const IPC_CHANNELS = {
  ACCOUNT_LIST: 'account:list',
  ACCOUNT_CREATE: 'account:create',
  ACCOUNT_UPDATE: 'account:update',
  ACCOUNT_DELETE: 'account:delete',
  ACCOUNT_GET_SETTINGS: 'account:get-settings',
  ACCOUNT_SET_SETTINGS: 'account:set-settings',
  VIEW_SWITCH: 'view:switch',
  VIEW_SET_OVERLAY: 'view:set-overlay',
  VIEW_RELOAD: 'view:reload',
  VIEW_CLEAR_SESSION: 'view:clear-session',
  VIEW_RESIZE: 'view:resize',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  UI_STATE_GET: 'ui-state:get',
  UI_STATE_SET: 'ui-state:set',
  APP_OPEN_DEVTOOLS: 'app:open-devtools',
  APP_OPEN_EXTERNAL: 'app:open-external'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
