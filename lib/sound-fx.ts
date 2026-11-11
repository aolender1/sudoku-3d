// Synthesized tactile ceramic sound effects using Web Audio API (offline-safe, zero external assets)

let audioCtx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (Ctx) {
      audioCtx = new Ctx()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function playTileSound(
  type: 'select' | 'place' | 'note' | 'erase' | 'error' | 'hint' | 'win',
  enabled: boolean
) {
  if (!enabled) return
  const ctx = getContext()
  if (!ctx) return

  const now = ctx.currentTime

  if (type === 'win') {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + idx * 0.085)
      gain.gain.setValueAtTime(0.001, now + idx * 0.085)
      gain.gain.exponentialRampToValueAtTime(0.11, now + idx * 0.085 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.085 + 0.42)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.085)
      osc.stop(now + idx * 0.085 + 0.45)
    })
    return
  }

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  switch (type) {
    case 'select': {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(420, now)
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.035)
      gain.gain.setValueAtTime(0.04, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)
      osc.start(now)
      osc.stop(now + 0.05)
      break
    }
    case 'place': {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(580, now)
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.055)
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)
      osc.start(now)
      osc.stop(now + 0.095)
      break
    }
    case 'note': {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(840, now)
      gain.gain.setValueAtTime(0.035, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04)
      osc.start(now)
      osc.stop(now + 0.045)
      break
    }
    case 'erase': {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(360, now)
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.055)
      gain.gain.setValueAtTime(0.05, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065)
      osc.start(now)
      osc.stop(now + 0.07)
      break
    }
    case 'hint': {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(660, now)
      osc.frequency.exponentialRampToValueAtTime(990, now + 0.12)
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
      osc.start(now)
      osc.stop(now + 0.19)
      break
    }
    case 'error': {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(185, now)
      osc.frequency.linearRampToValueAtTime(145, now + 0.14)
      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
      osc.start(now)
      osc.stop(now + 0.17)
      break
    }
  }
}
