import { z } from 'zod'

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  platform: z.enum(['whatsapp', 'telegram']),
  type: z.enum(['personal', 'business', 'standard'])
})

export const updateAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  type: z.enum(['personal', 'business', 'standard']).optional(),
  avatar: z.string().optional(),
  enabled: z.boolean().optional()
})

export const accountIdSchema = z.object({
  id: z.string().uuid()
})

export const viewSwitchSchema = z.object({
  accountId: z.string().uuid().nullable()
})

export const viewOverlaySchema = z.object({
  active: z.boolean(),
  accountId: z.string().uuid().nullable().optional()
})

export const viewBoundsSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().min(0),
  height: z.number().finite().min(0)
})

export const accountSettingsSchema = z.object({
  accountId: z.string().uuid(),
  settings: z.object({
    notificationsEnabled: z.boolean(),
    soundEnabled: z.boolean(),
    zoomFactor: z.number().min(0.5).max(3),
    backgroundMode: z.enum(['active', 'suspended'])
  })
})

export const appSettingsSchema = z.object({
  general: z.object({
    launchAtStartup: z.boolean(),
    startMinimized: z.boolean(),
    minimizeToTray: z.boolean(),
    closeToTray: z.boolean(),
    restoreLastActiveAccount: z.boolean(),
    restoreOpenedTabs: z.boolean()
  }),
  appearance: z.object({
    theme: z.enum(['system', 'light', 'dark']),
    sidebarMode: z.enum(['expanded', 'compact'])
  })
})

export const uiStateSchema = z.object({
  activeAccountId: z.string().uuid().nullable(),
  openedAccountIds: z.array(z.string().uuid()),
  sidebarMode: z.enum(['expanded', 'compact']),
  settingsOpen: z.boolean()
})
