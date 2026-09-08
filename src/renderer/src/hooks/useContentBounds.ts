import { useCallback, useEffect, useRef } from 'react'
import type { ViewBounds } from '@shared/types'

export function useContentBounds(enabled: boolean): {
  contentRef: React.RefObject<HTMLDivElement>
  reportBounds: () => void
} {
  const contentRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<HTMLElement | null>(null)

  const reportBounds = useCallback(() => {
    if (!enabled) {
      return
    }

    const element = contentRef.current
    if (!element) {
      return
    }

    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return
    }

    const bounds: ViewBounds = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }

    void window.mmwa.views.resize(bounds)
  }, [enabled])

  const scheduleReport = useCallback(() => {
    reportBounds()
    requestAnimationFrame(() => {
      reportBounds()
      requestAnimationFrame(reportBounds)
    })
    window.setTimeout(reportBounds, 100)
  }, [reportBounds])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const element = contentRef.current
    if (!element) {
      return
    }

    layoutRef.current = element.closest('[data-app-layout]') as HTMLElement | null

    const observer = new ResizeObserver(() => {
      scheduleReport()
    })

    observer.observe(element)
    if (layoutRef.current) {
      observer.observe(layoutRef.current)
    }

    scheduleReport()

    const unsubscribe = window.mmwa.app.onWindowResized(scheduleReport)
    return () => {
      observer.disconnect()
      unsubscribe()
    }
  }, [enabled, scheduleReport])

  return { contentRef, reportBounds: scheduleReport }
}
