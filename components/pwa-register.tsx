'use client'

import { useEffect, useSyncExternalStore } from 'react'

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
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(() => {
          pwaState = { ...pwaState, swReady: true }
          emitChange()
        })
        .catch(() => {
          // Ignore registration errors in restricted iframe contexts
        })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  return null
}
