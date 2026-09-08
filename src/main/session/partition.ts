import { v4 as uuidv4 } from 'uuid'
import type { Platform } from '@shared/types'

export function createAccountId(): string {
  return uuidv4()
}

export function buildPartition(platform: Platform, accountId: string): string {
  const slug = accountId.replace(/-/g, '').slice(0, 12)
  return `persist:mmwa-${platform}-${slug}`
}
