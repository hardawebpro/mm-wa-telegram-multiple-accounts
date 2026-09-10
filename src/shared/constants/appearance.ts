export type FontSizePreset = 'xs' | 's' | 'm' | 'l'

export const FONT_SIZE_PRESETS: readonly FontSizePreset[] = ['xs', 's', 'm', 'l'] as const

export const FONT_SIZE_PX: Record<FontSizePreset, number> = {
  xs: 12,
  s: 14,
  m: 16,
  l: 18
}

export const DEFAULT_FONT_SIZE: FontSizePreset = 's'

export const FONT_SIZE_LABELS: Record<FontSizePreset, string> = {
  xs: 'XS',
  s: 'S',
  m: 'M',
  l: 'L'
}
