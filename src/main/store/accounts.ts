import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AccountSettings, MessagingAccount } from '@shared/types'
import { DEFAULT_ACCOUNT_SETTINGS } from '@shared/types'
import { getUserDataPath } from '../utils/paths'

interface AccountsStoreData {
  accounts: MessagingAccount[]
  accountSettings: Record<string, AccountSettings>
}

const STORE_FILE = 'accounts.json'

function getStorePath(): string {
  const dir = join(getUserDataPath(), 'store')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, STORE_FILE)
}

function readStore(): AccountsStoreData {
  const path = getStorePath()
  if (!existsSync(path)) {
    return { accounts: [], accountSettings: {} }
  }

  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as AccountsStoreData
    return {
      accounts: parsed.accounts ?? [],
      accountSettings: parsed.accountSettings ?? {}
    }
  } catch {
    return { accounts: [], accountSettings: {} }
  }
}

function writeStore(data: AccountsStoreData): void {
  writeFileSync(getStorePath(), JSON.stringify(data, null, 2), 'utf-8')
}

export class AccountsStore {
  private data: AccountsStoreData

  constructor() {
    this.data = readStore()
  }

  list(): MessagingAccount[] {
    return [...this.data.accounts]
  }

  get(id: string): MessagingAccount | undefined {
    return this.data.accounts.find((account) => account.id === id)
  }

  add(account: MessagingAccount): void {
    this.data.accounts.push(account)
    this.data.accountSettings[account.id] = { ...DEFAULT_ACCOUNT_SETTINGS }
    writeStore(this.data)
  }

  update(id: string, patch: Partial<MessagingAccount>): MessagingAccount | undefined {
    const index = this.data.accounts.findIndex((account) => account.id === id)
    if (index === -1) {
      return undefined
    }

    this.data.accounts[index] = {
      ...this.data.accounts[index],
      ...patch,
      updatedAt: new Date().toISOString()
    }
    writeStore(this.data)
    return this.data.accounts[index]
  }

  remove(id: string): boolean {
    const before = this.data.accounts.length
    this.data.accounts = this.data.accounts.filter((account) => account.id !== id)
    delete this.data.accountSettings[id]
    writeStore(this.data)
    return this.data.accounts.length < before
  }

  getSettings(accountId: string): AccountSettings {
    const stored = this.data.accountSettings[accountId]
    return { ...DEFAULT_ACCOUNT_SETTINGS, ...stored }
  }

  setSettings(accountId: string, settings: AccountSettings): void {
    this.data.accountSettings[accountId] = settings
    writeStore(this.data)
  }
}
