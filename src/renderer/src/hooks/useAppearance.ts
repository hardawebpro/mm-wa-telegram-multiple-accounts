import { useEffect } from 'react'
import type { AppearanceSettings, ThemeMode } from '@shared/types'
import { FONT_SIZE_PX } from '@shared/constants/appearance'

function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function useAppearance(appearance: AppearanceSettings): void {
  useEffect(() => {
    const applyTheme = (): void => {
      const resolved = resolveTheme(appearance.theme)
      document.documentElement.classList.toggle('dark', resolved === 'dark')
    }

    applyTheme()

    if (appearance.theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      media.addEventListener('change', applyTheme)
      return () => media.removeEventListener('change', applyTheme)
    }

    return undefined
  }, [appearance.theme])

  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SIZE_PX[appearance.fontSize]}px`
    document.documentElement.dataset.fontSize = appearance.fontSize
  }, [appearance.fontSize])
}
