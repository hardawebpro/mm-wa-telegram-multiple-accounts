import { app } from 'electron'
import { appendFile, mkdir, rename, stat } from 'fs/promises'
import { join } from 'path'

const MAX_LOG_BYTES = 1024 * 1024

export type NotificationLogEvent =
  | 'poll-ok'
  | 'poll-timeout'
  | 'poll-late-discarded'
  | 'title-updated'
  | 'background-enter'
  | 'background-exit'
  | 'account-stale'
  | 'catch-up'
  | 'toast-shown'
  | 'toast-failed'
  | 'toast-skipped-read'

/** Never pass chat names, message text, or phone numbers here — the log is meant to be shareable. */
export interface NotificationLogFields {
  accountId?: string
  platform?: string
  unreadCount?: number
  latencyMs?: number
  visibilityState?: string | null
  detail?: string
}

let logPath: string | null = null
let writeQueue: Promise<void> = Promise.resolve()

function getLogPath(): string {
  if (!logPath) {
    logPath = join(app.getPath('userData'), 'logs', 'notifications.log')
  }
  return logPath
}

async function writeLine(line: string): Promise<void> {
  const path = getLogPath()
  await mkdir(join(path, '..'), { recursive: true })

  try {
    const { size } = await stat(path)
    if (size > MAX_LOG_BYTES) {
      await rename(path, `${path}.old`)
    }
  } catch {
    // File does not exist yet.
  }

  await appendFile(path, line, 'utf8')
}

export function logNotificationEvent(event: NotificationLogEvent, fields: NotificationLogFields = {}): void {
  const parts = [new Date().toISOString(), event]
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      parts.push(`${key}=${value}`)
    }
  }
  const line = `${parts.join(' ')}\n`

  writeQueue = writeQueue.then(() => writeLine(line)).catch(() => {
    // Logging must never break notifications.
  })
}
