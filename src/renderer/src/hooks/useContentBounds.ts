import { useCallback, useEffect, useRef } from 'react'
import type { ViewBounds } from '@shared/types'

const REPORT_DELAY_MS = [100, 300, 500] as const
const INVALID_RECT_RETRY_MS = [50, 150, 300] as const

export function useContentBounds(enabled: boolean): {
  contentRef: React.RefObject<HTMLDivElement>
  reportBounds: () => void
} {
  const contentRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<HTMLElement | null>(null)
  const lastReportedRef = useRef<ViewBounds | null>(null)
  const lastWindowSizeRef = useRef<{ width: number; height: number } | null>(null)
  const invalidRectRetryTimers = useRef<number[]>([])

  const clearInvalidRectRetries = useCallback(() => {
    for (const timer of invalidRectRetryTimers.current) {
      clearTimeout(timer)
    }
    invalidRectRetryTimers.current = []
  }, [])

  const reportBounds = useCallback(() => {
    if (!enabled) {
      return
    }

    const element = contentRef.current
    if (!element) {
      return
    }

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const previousWindow = lastWindowSizeRef.current
    lastWindowSizeRef.current = { width: windowWidth, height: windowHeight }

    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      if (invalidRectRetryTimers.current.length === 0) {
        for (const delayMs of INVALID_RECT_RETRY_MS) {
          invalidRectRetryTimers.current.push(
            window.setTimeout(() => {
              reportBounds()
            }, delayMs)
          )
        }
      }
      return
    }

    clearInvalidRectRetries()

    const bounds: ViewBounds = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }

    const lastReported = lastReportedRef.current
    const windowSizeChanged =
      previousWindow !== null &&
      (previousWindow.width !== windowWidth || previousWindow.height !== windowHeight)
    const contentSizeUnchanged =
      lastReported !== null &&
      lastReported.width === bounds.width &&
      lastReported.height === bounds.height

    if (windowSizeChanged && contentSizeUnchanged) {
      requestAnimationFrame(() => {
        reportBounds()
        requestAnimationFrame(reportBounds)
      })
      return
    }

    if (
      lastReported &&
      lastReported.x === bounds.x &&
      lastReported.y === bounds.y &&
      lastReported.width === bounds.width &&
      lastReported.height === bounds.height
    ) {
      return
    }

    lastReportedRef.current = bounds
    void window.mmwa.views.resize(bounds)
  }, [clearInvalidRectRetries, enabled])

  const scheduleReport = useCallback(() => {
    reportBounds()
    requestAnimationFrame(() => {
      reportBounds()
      requestAnimationFrame(reportBounds)
    })
    for (const delayMs of REPORT_DELAY_MS) {
      window.setTimeout(reportBounds, delayMs)
    }
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

    const onWindowResize = (): void => {
      scheduleReport()
    }
    window.addEventListener('resize', onWindowResize)

    const unsubscribe = window.mmwa.app.onWindowResized(scheduleReport)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onWindowResize)
      unsubscribe()
      clearInvalidRectRetries()
    }
  }, [clearInvalidRectRetries, enabled, scheduleReport])

  return { contentRef, reportBounds: scheduleReport }
}
