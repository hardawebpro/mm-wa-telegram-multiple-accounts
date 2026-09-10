import { ipcMain, shell } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc/channels'
import type { IpcResponse } from '@shared/types'
import {
  accountIdSchema,
  accountSettingsSchema,
  appSettingsSchema,
  createAccountSchema,
  openExternalSchema,
  uiStateSchema,
  updateAccountSchema,
  viewBoundsSchema,
  viewSwitchSchema,
  viewOverlaySchema
} from '@shared/schemas'
import { createAccountId, buildPartition } from '../session/partition'
import type { MessagingViewManager } from '../messaging/MessagingViewManager'
import type { AccountsStore } from '../store/accounts'
import type { SettingsStore, UiStateStore } from '../store/settings'

function success<T>(data: T): IpcResponse<T> {
  return { ok: true, data }
}

function failure(error: string): IpcResponse<never> {
  return { ok: false, error }
}

function parse<T>(schema: { parse: (input: unknown) => T }, input: unknown): T | IpcResponse<never> {
  try {
    return schema.parse(input)
  } catch {
    return failure('Invalid request payload')
  }
}

export interface IpcContext {
  viewManager: MessagingViewManager
  accountsStore: AccountsStore
  settingsStore: SettingsStore
  uiStateStore: UiStateStore
  isDev: boolean
}

export function registerIpcHandlers(ctx: IpcContext): void {
  const { viewManager, accountsStore, settingsStore, uiStateStore, isDev } = ctx

  ipcMain.handle(IPC_CHANNELS.ACCOUNT_LIST, () => {
    return success(accountsStore.list())
  })

  ipcMain.handle(IPC_CHANNELS.ACCOUNT_CREATE, (_event, raw) => {
    const parsed = parse(createAccountSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    const input = parsed as ReturnType<typeof createAccountSchema.parse>
    const id = createAccountId()
    const now = new Date().toISOString()
    const account = {
      id,
      name: input.name,
      platform: input.platform,
      type: input.type,
      partition: buildPartition(input.platform, id),
      enabled: true,
      createdAt: now,
      updatedAt: now
    }

    accountsStore.add(account)
    viewManager.createView(account)
    return success(account)
  })

  ipcMain.handle(IPC_CHANNELS.ACCOUNT_UPDATE, (_event, raw) => {
    const parsed = parse(updateAccountSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    const input = parsed as ReturnType<typeof updateAccountSchema.parse>
    const updated = accountsStore.update(input.id, input)
    if (!updated) {
      return failure('Account not found')
    }

    return success(updated)
  })

  ipcMain.handle(IPC_CHANNELS.ACCOUNT_DELETE, async (_event, raw) => {
    const parsed = parse(accountIdSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    const { id } = parsed as ReturnType<typeof accountIdSchema.parse>
    const account = accountsStore.get(id)
    if (!account) {
      return failure('Account not found')
    }

    await viewManager.clearSession(id)
    viewManager.destroyView(id)
    accountsStore.remove(id)
    return success(undefined)
  })

  ipcMain.handle(IPC_CHANNELS.ACCOUNT_GET_SETTINGS, (_event, raw) => {
    const parsed = parse(accountIdSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    const { id } = parsed as ReturnType<typeof accountIdSchema.parse>
    return success(accountsStore.getSettings(id))
  })

  ipcMain.handle(IPC_CHANNELS.ACCOUNT_SET_SETTINGS, (_event, raw) => {
    const parsed = parse(accountSettingsSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    const input = parsed as ReturnType<typeof accountSettingsSchema.parse>
    accountsStore.setSettings(input.accountId, input.settings)
    return success(undefined)
  })

  ipcMain.handle(IPC_CHANNELS.VIEW_SWITCH, (_event, raw) => {
    const parsed = parse(viewSwitchSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    const { accountId } = parsed as ReturnType<typeof viewSwitchSchema.parse>
    if (accountId === null) {
      viewManager.hideAllViews()
      return success(undefined)
    }

    if (!viewManager.hasView(accountId)) {
      const account = accountsStore.get(accountId)
      if (account) {
        viewManager.createView(account)
      }
    }

    viewManager.showView(accountId)
    return success(undefined)
  })

  ipcMain.handle(IPC_CHANNELS.VIEW_SET_OVERLAY, (_event, raw) => {
    const parsed = parse(viewOverlaySchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    const input = parsed as ReturnType<typeof viewOverlaySchema.parse>
    viewManager.setOverlayActive(input.active, input.accountId)
    return success(undefined)
  })

  ipcMain.handle(IPC_CHANNELS.VIEW_RELOAD, (_event, raw) => {
    const parsed = parse(accountIdSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    const { id } = parsed as ReturnType<typeof accountIdSchema.parse>
    viewManager.reloadView(id)
    return success(undefined)
  })

  ipcMain.handle(IPC_CHANNELS.VIEW_CLEAR_SESSION, async (_event, raw) => {
    const parsed = parse(accountIdSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    const { id } = parsed as ReturnType<typeof accountIdSchema.parse>
    await viewManager.clearSession(id)
    viewManager.reloadView(id)
    return success(undefined)
  })

  ipcMain.handle(IPC_CHANNELS.VIEW_RESIZE, (_event, raw) => {
    const parsed = parse(viewBoundsSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    viewManager.resizeActiveView(parsed as ReturnType<typeof viewBoundsSchema.parse>)
    return success(undefined)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return success(settingsStore.get())
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, raw) => {
    const parsed = parse(appSettingsSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    settingsStore.set(parsed as ReturnType<typeof appSettingsSchema.parse>)
    return success(undefined)
  })

  ipcMain.handle(IPC_CHANNELS.UI_STATE_GET, () => {
    return success(uiStateStore.get())
  })

  ipcMain.handle(IPC_CHANNELS.UI_STATE_SET, (_event, raw) => {
    const parsed = parse(uiStateSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    uiStateStore.set(parsed as ReturnType<typeof uiStateSchema.parse>)
    return success(undefined)
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_DEVTOOLS, () => {
    if (!isDev) {
      return failure('DevTools are only available in development mode')
    }

    const view = viewManager.getActiveAccountId()
      ? viewManager.getView(viewManager.getActiveAccountId()!)
      : undefined
    view?.webContents.openDevTools({ mode: 'detach' })
    return success(undefined)
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, (_event, raw) => {
    const parsed = parse(openExternalSchema, raw)
    if ('ok' in parsed && parsed.ok === false) {
      return parsed
    }

    const { url } = parsed as ReturnType<typeof openExternalSchema.parse>
    void shell.openExternal(url)
    return success(undefined)
  })
}
