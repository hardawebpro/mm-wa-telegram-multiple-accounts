import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AppSettings, UiState } from '@shared/types'
import { DEFAULT_APP_SETTINGS, DEFAULT_UI_STATE } from '@shared/types'
import { getUserDataPath } from '../utils/paths'

function getStoreDir(): string {
  const dir = join(getUserDataPath(), 'store')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function readJsonFile<T>(filename: string, fallback: T): T {
  const path = join(getStoreDir(), filename)
  if (!existsSync(path)) {
    return fallback
  }

  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch {
    return fallback
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  writeFileSync(join(getStoreDir(), filename), JSON.stringify(data, null, 2), 'utf-8')
}

export class SettingsStore {
  get(): AppSettings {
    return readJsonFile('settings.json', DEFAULT_APP_SETTINGS)
  }

  set(settings: AppSettings): void {
    writeJsonFile('settings.json', settings)
  }
}

export class UiStateStore {
  get(): UiState {
    return readJsonFile('ui-state.json', DEFAULT_UI_STATE)
  }

  set(state: UiState): void {
    writeJsonFile('ui-state.json', state)
  }
}
