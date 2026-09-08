import { useEffect } from 'react'
import type { ThemeMode } from '@shared/types'

function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function useTheme(theme: ThemeMode): void {
  useEffect(() => {
    const apply = (): void => {
      const resolved = resolveTheme(theme)
      document.documentElement.classList.toggle('dark', resolved === 'dark')
    }

    apply()

    if (theme !== 'system') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}
