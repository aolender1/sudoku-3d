'use client'

import { useEffect, useSyncExternalStore } from 'react'

declare global {
  interface Window {
    __kubikROGuard?: boolean
  }
}

function installResizeObserverGuard() {
  if (
    typeof window === 'undefined' ||
    typeof window.ResizeObserver !== 'function' ||
    window.__kubikROGuard
  ) {
    return
  }
  window.__kubikROGuard = true

  const NativeRO = window.ResizeObserver

  const PatchedResizeObserver = function (
    this: ResizeObserver,
    callback: ResizeObserverCallback
  ): ResizeObserver {
    let rafId = 0
    const pending = new Map<Element, ResizeObserverEntry>()

    const ro = new NativeRO((entries) => {
      for (const entry of entries) {
        pending.set(entry.target, entry)
      }
      if (!rafId) {
        rafId = window.requestAnimationFrame(() => {
          rafId = 0
          if (pending.size === 0) return
          const batch = Array.from(pending.values())
          pending.clear()
          callback(batch, ro)
        })
      }
    })

    const origUnobserve = ro.unobserve.bind(ro)
    const origDisconnect = ro.disconnect.bind(ro)

    ro.unobserve = (target: Element) => {
      pending.delete(target)
      origUnobserve(target)
    }

    ro.disconnect = () => {
      pending.clear()
      if (rafId) {
        window.cancelAnimationFrame(rafId)
        rafId = 0
      }
      origDisconnect()
    }

    return ro
  } as unknown as typeof ResizeObserver

  PatchedResizeObserver.prototype = NativeRO.prototype
  window.ResizeObserver = PatchedResizeObserver

  window.addEventListener(
    'error',
    (event: ErrorEvent) => {
      if (
        typeof event.message === 'string' &&
        event.message.includes('ResizeObserver loop')
      ) {
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    },
    true
  )
}

if (typeof window !== 'undefined') {
  installResizeObserverGuard()
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PwaState {
  deferredPrompt: BeforeInstallPromptEvent | null
  isStandalone: boolean
  swReady: boolean
}

let pwaState: PwaState = {
  deferredPrompt: null,
  isStandalone: false,
  swReady: false,
}

const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): PwaState {
  return pwaState
}

const SERVER_SNAPSHOT: PwaState = {
  deferredPrompt: null,
  isStandalone: false,
  swReady: false,
}

function getServerSnapshot(): PwaState {
  return SERVER_SNAPSHOT
}

export function usePwaInstall() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'manual'> => {
    if (!state.deferredPrompt) {
      return 'manual'
    }
    await state.deferredPrompt.prompt()
    const choice = await state.deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      pwaState = { ...pwaState, deferredPrompt: null }
      emitChange()
    }
    return choice.outcome
  }

  return {
    canPromptNatively: Boolean(state.deferredPrompt),
    isStandalone: state.isStandalone,
    swReady: state.swReady,
    promptInstall,
  }
}

export function PwaRegister() {
  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    pwaState = { ...pwaState, isStandalone: standalone }
    emitChange()

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      pwaState = {
        ...pwaState,
        deferredPrompt: e as BeforeInstallPromptEvent,
      }
      emitChange()
    }

    const onAppInstalled = () => {
      pwaState = {
        ...pwaState,
        deferredPrompt: null,
        isStandalone: true,
      }
      emitChange()
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then(() => {
            pwaState = { ...pwaState, swReady: true }
            emitChange()
          })
          .catch(() => {
            // Ignore registration errors in restricted iframe contexts
          })
      } else {
        // In development, unregister stale service workers and clear cached dev chunks
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(registrations.map((reg) => reg.unregister()))
          )
          .catch(() => {})

        if ('caches' in window) {
          caches
            .keys()
            .then((keys) =>
              Promise.all(
                keys
                  .filter((k) => k.startsWith('kubik-sudoku-pwa'))
                  .map((k) => caches.delete(k))
              )
            )
            .catch(() => {})
        }
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  return null
}
