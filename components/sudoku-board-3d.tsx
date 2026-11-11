'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, RoundedBox } from '@react-three/drei'

type OrbitControlsRef = React.ComponentRef<typeof OrbitControls>
import {
  BoxIcon,
  CompassIcon,
  EyeIcon,
  LayersIcon,
  PlayIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  hasNote,
  type CameraPreset,
  type SudokuGameController,
} from '@/hooks/use-sudoku-game'
import { cn } from '@/lib/utils'

const CELL_STEP = 1.02
const BOX_GAP = 0.18

function getCellCoord(rc: number): number {
  return (rc - 4) * CELL_STEP + (Math.floor(rc / 3) - 1) * BOX_GAP
}

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

const textureCache = new Map<string, THREE.CanvasTexture>()

interface LabelTextureParams {
  digit: number
  notesMask: number
  isGiven: boolean
  isConflict: boolean
  isSelected: boolean
  isSameDigit: boolean
  highlightNoteDigit: number | null
  isDark: boolean
}

function getTileLabelTexture(params: LabelTextureParams): THREE.CanvasTexture | null {
  const {
    digit,
    notesMask,
    isGiven,
    isConflict,
    isSelected,
    isSameDigit,
    highlightNoteDigit,
    isDark,
  } = params

  if (digit === 0 && notesMask === 0) {
    return null
  }

  const activeNoteHighlight =
    digit === 0 && highlightNoteDigit !== null && hasNote(notesMask, highlightNoteDigit)
      ? highlightNoteDigit
      : 0

  const key = `${digit}|${notesMask}|${isGiven ? 1 : 0}|${isConflict ? 1 : 0}|${isSelected ? 1 : 0}|${isSameDigit ? 1 : 0}|${activeNoteHighlight}|${isDark ? 1 : 0}`
  const cached = textureCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, 256, 256)

  if (digit > 0) {
    let textColor = isDark ? '#f1f5f9' : '#0f172a'
    if (isConflict) {
      textColor = isDark ? '#fca5a5' : '#dc2626'
    } else if (isSelected) {
      textColor = '#ffffff'
    } else if (!isGiven) {
      textColor = isDark ? '#93c5fd' : '#1d4ed8'
    }

    ctx.fillStyle = textColor
    ctx.font = `${isGiven ? 700 : 600} 150px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(digit), 128, 134)

    // Subtle corner pin dot for immutable initial clues (accessibility beyond color alone)
    if (isGiven) {
      ctx.beginPath()
      ctx.arc(214, 42, 9, 0, Math.PI * 2)
      ctx.fillStyle = isSelected
        ? 'rgba(255,255,255,0.75)'
        : isDark
          ? 'rgba(148,163,184,0.65)'
          : 'rgba(71,85,105,0.55)'
      ctx.fill()
    } else if (isConflict) {
      ctx.beginPath()
      ctx.arc(214, 42, 11, 0, Math.PI * 2)
      ctx.fillStyle = isDark ? '#f87171' : '#dc2626'
      ctx.fill()
    }
  } else if (notesMask > 0) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let d = 1; d <= 9; d++) {
      if (!hasNote(notesMask, d)) continue
      const nr = Math.floor((d - 1) / 3)
      const nc = (d - 1) % 3
      const cx = 48 + nc * 80
      const cy = 50 + nr * 78

      if (activeNoteHighlight === d) {
        ctx.beginPath()
        ctx.roundRect(cx - 28, cy - 28, 56, 56, 12)
        ctx.fillStyle = isSelected
          ? 'rgba(255,255,255,0.28)'
          : isDark
            ? 'rgba(245,158,11,0.32)'
            : 'rgba(217,119,6,0.22)'
        ctx.fill()
        ctx.fillStyle = isSelected
          ? '#ffffff'
          : isDark
            ? '#fde68a'
            : '#b45309'
        ctx.font = '700 48px "JetBrains Mono", ui-monospace, monospace'
      } else {
        ctx.fillStyle = isSelected
          ? 'rgba(255,255,255,0.92)'
          : isDark
            ? '#cbd5e1'
            : '#334155'
        ctx.font = '600 44px "JetBrains Mono", ui-monospace, monospace'
      }

      ctx.fillText(String(d), cx, cy + 2)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  textureCache.set(key, texture)
  return texture
}

const coordTextureCache = new Map<string, THREE.CanvasTexture>()

function getCoordTexture(label: string, isDark: boolean): THREE.CanvasTexture | null {
  const key = `${label}|${isDark ? 1 : 0}`
  const cached = coordTextureCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, 128, 128)
  ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.82)' : 'rgba(51, 65, 85, 0.82)'
  ctx.font = '700 58px "JetBrains Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 64, 66)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  coordTextureCache.set(key, tex)
  return tex
}

interface TileProps {
  index: number
  row: number
  col: number
  digit: number
  notesMask: number
  isGiven: boolean
  isSelected: boolean
  isPeer: boolean
  isConflict: boolean
  isSameDigit: boolean
  isLastHint: boolean
  highlightNoteDigit: number | null
  reliefMode: boolean
  isWon: boolean
  isDark: boolean
  onSelect: (index: number) => void
  pointerDownRef: React.MutableRefObject<{ x: number; y: number }>
}

function SudokuTile3D({
  index,
  row,
  col,
  digit,
  notesMask,
  isGiven,
  isSelected,
  isPeer,
  isConflict,
  isSameDigit,
  isLastHint,
  highlightNoteDigit,
  reliefMode,
  isWon,
  isDark,
  onSelect,
  pointerDownRef,
}: TileProps) {
  const groupRef = useRef<THREE.Group>(null)
  const shaftRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const x = useMemo(() => getCellCoord(col), [col])
  const z = useMemo(() => getCellCoord(row), [row])

  const labelTexture = useMemo(() => {
    if (typeof document === 'undefined') return null
    return getTileLabelTexture({
      digit,
      notesMask,
      isGiven,
      isConflict,
      isSelected,
      isSameDigit,
      highlightNoteDigit,
      isDark,
    })
  }, [
    digit,
    notesMask,
    isGiven,
    isConflict,
    isSelected,
    isSameDigit,
    highlightNoteDigit,
    isDark,
  ])

  const tileColor = useMemo(() => {
    const altQuadrant = (Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 1

    if (isSelected) {
      return isConflict ? '#dc2626' : '#2563eb'
    }
    if (isConflict) {
      return isDark ? '#451a1a' : '#fee2e2'
    }
    if (isLastHint) {
      return isDark ? '#78350f' : '#fef3c7'
    }
    if (isSameDigit) {
      return isDark ? '#1e3a8a' : '#dbeafe'
    }
    if (hovered) {
      return isDark ? '#334155' : '#e2e8f0'
    }
    if (isPeer) {
      return isDark ? '#243046' : '#e8eef7'
    }
    if (isGiven) {
      return altQuadrant
        ? isDark
          ? '#1e2f48'
          : '#e2e8f0'
        : isDark
          ? '#273954'
          : '#f1f5f9'
    }
    return altQuadrant
      ? isDark
        ? '#152236'
        : '#f8fafc'
      : isDark
        ? '#1d2d44'
        : '#ffffff'
  }, [
    row,
    col,
    isSelected,
    isConflict,
    isLastHint,
    isSameDigit,
    hovered,
    isPeer,
    isGiven,
    isDark,
  ])

  const pillarColor = useMemo(() => {
    if (isSelected) return '#1d4ed8'
    if (isConflict) return '#b91c1c'
    if (isSameDigit) return isDark ? '#2563eb' : '#60a5fa'
    return isDark ? '#0f172a' : '#cbd5e1'
  }, [isSelected, isConflict, isSameDigit, isDark])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime

    let targetElevation = 0.22
    if (reliefMode && digit > 0) {
      targetElevation += digit * 0.105
    }
    if (isPeer) targetElevation += 0.035
    if (isSameDigit) targetElevation += 0.12
    if (hovered) targetElevation += 0.08
    if (isSelected) {
      targetElevation += 0.24 + Math.sin(t * 4.2) * 0.025
    }
    if (isWon) {
      const wave = Math.sin(t * 3.8 - (row + col) * 0.42)
      targetElevation += Math.max(0, wave) * 0.34
    }

    const damp = 1 - Math.exp(-14 * delta)
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      targetElevation,
      damp
    )

    if (isConflict) {
      groupRef.current.position.x = Math.sin(t * 28) * 0.025
    } else {
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        0,
        damp
      )
    }

    if (shaftRef.current) {
      const shaftHeight = Math.max(0.02, groupRef.current.position.y - 0.12)
      shaftRef.current.scale.y = shaftHeight
      shaftRef.current.position.y = -0.15 - shaftHeight / 2 + 0.03
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const dx = e.clientX - pointerDownRef.current.x
    const dy = e.clientY - pointerDownRef.current.y
    if (Math.hypot(dx, dy) > 8) return
    onSelect(index)
  }

  return (
    <group position={[x, 0.22, z]}>
      <group ref={groupRef} position={[0, 0.22, 0]}>
        {/* Supporting anodized elevation shaft when raised */}
        <mesh ref={shaftRef} position={[0, -0.2, 0]} receiveShadow>
          <boxGeometry args={[0.78, 1, 0.78]} />
          <meshStandardMaterial
            color={pillarColor}
            roughness={0.45}
            metalness={0.25}
          />
        </mesh>

        {/* Tactile Rounded Ceramic/Anodized Tile */}
        <RoundedBox
          args={[0.92, 0.3, 0.92]}
          radius={0.075}
          smoothness={3}
          castShadow
          receiveShadow
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = 'auto'
          }}
        >
          <meshStandardMaterial
            color={tileColor}
            roughness={isGiven ? 0.34 : 0.24}
            metalness={isSelected ? 0.18 : 0.08}
          />
        </RoundedBox>

        {/* Selected Perimeter Halo */}
        {isSelected && (
          <mesh position={[0, 0.154, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.39, 0.445, 32]} />
            <meshBasicMaterial color="#93c5fd" transparent opacity={0.95} />
          </mesh>
        )}

        {/* Crisp HiDPI Digit / Candidate Notes Top Surface */}
        {labelTexture && (
          <mesh position={[0, 0.153, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.8, 0.8]} />
            <meshBasicMaterial
              map={labelTexture}
              transparent
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
    </group>
  )
}

function BoardPedestal({ isDark }: { isDark: boolean }) {
  const subBoxes = useMemo(() => {
    const items: { key: string; x: number; z: number; alt: boolean }[] = []
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const centerRow = br * 3 + 1
        const centerCol = bc * 3 + 1
        items.push({
          key: `${br}-${bc}`,
          x: getCellCoord(centerCol),
          z: getCellCoord(centerRow),
          alt: (br + bc) % 2 === 1,
        })
      }
    }
    return items
  }, [])

  const rowCoords = useMemo(() => {
    if (typeof document === 'undefined') return []
    return ROW_LABELS.map((label, r) => ({
      label,
      z: getCellCoord(r),
      tex: getCoordTexture(label, isDark),
    }))
  }, [isDark])

  const colCoords = useMemo(() => {
    if (typeof document === 'undefined') return []
    return Array.from({ length: 9 }, (_, c) => ({
      label: String(c + 1),
      x: getCellCoord(c),
      tex: getCoordTexture(String(c + 1), isDark),
    }))
  }, [isDark])

  return (
    <group>
      {/* Main Machined Architectural Base Frame */}
      <RoundedBox
        args={[10.55, 0.44, 10.55]}
        radius={0.22}
        smoothness={4}
        position={[0, -0.18, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color={isDark ? '#0b1120' : '#cbd5e1'}
          roughness={0.48}
          metalness={0.28}
        />
      </RoundedBox>

      {/* Recessed Inner Tray Bed */}
      <mesh position={[0, 0.045, 0]} receiveShadow>
        <boxGeometry args={[9.88, 0.04, 9.88]} />
        <meshStandardMaterial
          color={isDark ? '#020617' : '#94a3b8'}
          roughness={0.65}
          metalness={0.2}
        />
      </mesh>

      {/* 9 Distinct 3x3 Quadrant Sub-Plates */}
      {subBoxes.map((b) => (
        <RoundedBox
          key={b.key}
          args={[3.1, 0.11, 3.1]}
          radius={0.08}
          smoothness={2}
          position={[b.x, 0.075, b.z]}
          receiveShadow
        >
          <meshStandardMaterial
            color={
              b.alt
                ? isDark
                  ? '#132038'
                  : '#dbe4f0'
                : isDark
                  ? '#0f172a'
                  : '#e8eef5'
            }
            roughness={0.5}
            metalness={0.15}
          />
        </RoundedBox>
      ))}

      {/* Coordinate Engravings: Rows A-I on Left Bevel */}
      {rowCoords.map(
        (rc) =>
          rc.tex && (
            <mesh
              key={rc.label}
              position={[-5.02, 0.05, rc.z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.38, 0.38]} />
              <meshBasicMaterial
                map={rc.tex}
                transparent
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          )
      )}

      {/* Coordinate Engravings: Columns 1-9 on Front Bevel */}
      {colCoords.map(
        (cc) =>
          cc.tex && (
            <mesh
              key={cc.label}
              position={[cc.x, 0.05, 5.02]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.38, 0.38]} />
              <meshBasicMaterial
                map={cc.tex}
                transparent
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          )
      )}
    </group>
  )
}

const PRESET_VECTORS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  isometric: { pos: [0, 12.2, 8.6], target: [0, -0.05, 0.25] },
  top: { pos: [0, 15.2, 0.5], target: [0, 0, 0] },
  angled: { pos: [7.2, 11.4, 8.2], target: [0, -0.05, 0.1] },
}

function CameraRig({
  preset,
  resetTick,
}: {
  preset: CameraPreset
  resetTick: number
}) {
  const controlsRef = useRef<OrbitControlsRef>(null)
  const { camera, size } = useThree()
  const animatingRef = useRef(true)
  const desiredPos = useRef(new THREE.Vector3(...PRESET_VECTORS.isometric.pos))
  const desiredTarget = useRef(
    new THREE.Vector3(...PRESET_VECTORS.isometric.target)
  )

  useEffect(() => {
    const config = PRESET_VECTORS[preset]
    const aspect = size.height > 0 ? size.width / size.height : 1.2
    const portraitZoomOut =
      aspect < 1.15 ? Math.min(1.62, 1.28 / Math.max(0.55, aspect)) : 1
    desiredPos.current
      .set(...config.pos)
      .multiplyScalar(portraitZoomOut)
    desiredTarget.current.set(...config.target)
    animatingRef.current = true
  }, [preset, resetTick, size.width, size.height])

  useFrame((_, delta) => {
    if (!animatingRef.current || !controlsRef.current) return
    const damp = 1 - Math.exp(-7.5 * delta)
    camera.position.lerp(desiredPos.current, damp)
    controlsRef.current.target.lerp(desiredTarget.current, damp)
    controlsRef.current.update()

    if (
      camera.position.distanceTo(desiredPos.current) < 0.04 &&
      controlsRef.current.target.distanceTo(desiredTarget.current) < 0.04
    ) {
      animatingRef.current = false
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={9.5}
      maxDistance={28}
      minPolarAngle={0.04}
      maxPolarAngle={1.16}
      rotateSpeed={0.72}
      zoomSpeed={0.85}
      onStart={() => {
        animatingRef.current = false
      }}
    />
  )
}

function check3DSupport(): {
  supported: boolean
  hasWebGL2: boolean
  hasWebGL1: boolean
} {
  if (typeof window === 'undefined') {
    return { supported: true, hasWebGL2: true, hasWebGL1: true }
  }
  try {
    const p2 = document.createElement('canvas')
    const hasWebGL2 = Boolean(p2.getContext('webgl2'))
    if (hasWebGL2) {
      return { supported: true, hasWebGL2: true, hasWebGL1: true }
    }
    const p1 = document.createElement('canvas')
    const hasWebGL1 = Boolean(
      p1.getContext('webgl') || p1.getContext('experimental-webgl')
    )
    return {
      supported: hasWebGL1,
      hasWebGL2: false,
      hasWebGL1,
    }
  } catch {
    return { supported: false, hasWebGL2: false, hasWebGL1: false }
  }
}

export function SudokuBoard3D({ game }: { game: SudokuGameController }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'
  const pointerDownRef = useRef({ x: 0, y: 0 })
  const [support, setSupport] = useState<{
    ready: boolean
    supported: boolean
    hasWebGL2: boolean
    hasWebGL1: boolean
  }>({
    ready: false,
    supported: true,
    hasWebGL2: true,
    hasWebGL1: true,
  })

  useEffect(() => {
    const res = check3DSupport()
    setSupport({ ready: true, ...res })
  }, [])

  const selectedLabel = useMemo(() => {
    if (game.selectedIndex === null) return 'Ninguna'
    const r = Math.floor(game.selectedIndex / 9)
    const c = game.selectedIndex % 9
    return `${ROW_LABELS[r]}${c + 1}`
  }, [game.selectedIndex])

  if (support.ready && !support.supported) {
    return (
      <div className="flex h-full min-h-80 w-full flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-6 text-center">
        <BoxIcon className="size-8 text-primary" />
        <p className="text-base font-semibold">
          WebGL no está disponible en este dispositivo
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Cambia al modo 2D Clásico para continuar tu partida con el mismo progreso.
        </p>
        <Button onClick={() => game.setMode('2d')}>Abrir Modo 2D Clásico</Button>
      </div>
    )
  }

  return (
    <div
      className="relative flex h-[39dvh] max-h-[360px] min-h-[260px] w-full shrink-0 overflow-hidden rounded-2xl border bg-card shadow-xs sm:h-[48dvh] sm:max-h-[470px] lg:h-full lg:max-h-none lg:min-h-[560px] lg:flex-1"
      onPointerDown={(e) => {
        pointerDownRef.current = { x: e.clientX, y: e.clientY }
      }}
    >
      {/* Top-left HUD: Active Cell Coordinate + 3D Relief Mode */}
      <div className="pointer-events-none absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="secondary"
          className="pointer-events-auto border bg-background/85 font-mono text-xs backdrop-blur-md"
        >
          Celda {selectedLabel}
        </Badge>
        <Button
          variant={game.reliefMode ? 'default' : 'outline'}
          size="xs"
          onClick={() => game.setReliefMode(!game.reliefMode)}
          className={cn(
            'pointer-events-auto backdrop-blur-md',
            !game.reliefMode && 'bg-background/85'
          )}
          title="Alternar altura 3D proporcional al número (1 a 9)"
        >
          <LayersIcon data-icon="inline-start" />
          {game.reliefMode ? 'Torres 1–9: ON' : 'Torres 1–9'}
        </Button>
      </div>

      {/* Top-right HUD: Camera Angle Presets */}
      <div
        className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-lg border bg-background/85 p-1 backdrop-blur-md"
        role="group"
        aria-label="Vistas de cámara 3D"
      >
        <Button
          variant={game.cameraPreset === 'isometric' ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => game.triggerCameraPreset('isometric')}
          title="Vista isométrica 3D"
        >
          <BoxIcon data-icon="inline-start" />
          <span className="hidden sm:inline">3D</span>
        </Button>
        <Button
          variant={game.cameraPreset === 'top' ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => game.triggerCameraPreset('top')}
          title="Vista cenital superior"
        >
          <EyeIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Cenital</span>
        </Button>
        <Button
          variant={game.cameraPreset === 'angled' ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => game.triggerCameraPreset('angled')}
          title="Vista diagonal arquitectónica"
        >
          <CompassIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Diagonal</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => game.triggerCameraPreset(game.cameraPreset)}
          aria-label="Centrar cámara"
          title="Centrar cámara"
        >
          <RotateCcwIcon />
        </Button>
      </div>

      {/* Bottom Gesture Hint */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
        <span className="rounded-full border bg-background/80 px-2.5 py-0.5 text-[11px] text-muted-foreground backdrop-blur-md whitespace-nowrap">
          Arrastra para orbitar · Pellizca para zoom · Toca una ficha
        </span>
      </div>

      {/* Three.js Canvas (supports WebGL2 with automatic WebGL1Renderer fallback) */}
      {support.ready && (
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 12.2, 8.6], fov: 42, near: 0.5, far: 75 }}
          gl={(defaultProps) => {
            if (support.hasWebGL2) {
              return new THREE.WebGLRenderer({
                ...defaultProps,
                antialias: true,
              })
            }
            const LegacyWebGL1 = (
              THREE as unknown as {
                WebGL1Renderer: typeof THREE.WebGLRenderer
              }
            ).WebGL1Renderer
            return new LegacyWebGL1({
              ...defaultProps,
              antialias: true,
            })
          }}
        >
        <color attach="background" args={[isDark ? '#0e1422' : '#eef2f7']} />
        <fog attach="fog" args={[isDark ? '#0e1422' : '#eef2f7', 22, 38]} />

        <ambientLight intensity={isDark ? 0.72 : 0.92} />
        <directionalLight
          position={[8, 16, 10]}
          intensity={isDark ? 1.35 : 1.15}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
          shadow-bias={-0.0005}
        />
        <directionalLight
          position={[-8, 9, -7]}
          intensity={isDark ? 0.55 : 0.4}
          color={isDark ? '#60a5fa' : '#93c5fd'}
        />

        <CameraRig
          preset={game.cameraPreset}
          resetTick={game.cameraResetTick}
        />

        <group>
          <BoardPedestal isDark={isDark} />

          {!game.isPaused &&
            game.board.map((digit, idx) => {
              const row = Math.floor(idx / 9)
              const col = idx % 9
              const isGiven = game.initialBoard[idx] !== 0
              const isSelected = game.selectedIndex === idx
              const isPeer = game.peerSet.has(idx)
              const isConflict = game.conflicts.has(idx)
              const isSameDigit =
                digit !== 0 &&
                game.activeHighlightDigit !== null &&
                digit === game.activeHighlightDigit &&
                !isSelected

              return (
                <SudokuTile3D
                  key={idx}
                  index={idx}
                  row={row}
                  col={col}
                  digit={digit}
                  notesMask={game.notes[idx]}
                  isGiven={isGiven}
                  isSelected={isSelected}
                  isPeer={isPeer}
                  isConflict={isConflict}
                  isSameDigit={isSameDigit}
                  isLastHint={game.lastHintIndex === idx}
                  highlightNoteDigit={game.activeHighlightDigit}
                  reliefMode={game.reliefMode}
                  isWon={game.isWon}
                  isDark={isDark}
                  onSelect={game.selectCell}
                  pointerDownRef={pointerDownRef}
                />
              )
            })}
        </group>
        </Canvas>
      )}

      {/* Pause Veil */}
      {game.isPaused && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-md">
          <p className="text-lg font-semibold tracking-tight">Partida en pausa</p>
          <p className="text-sm text-muted-foreground">
            El tablero 3D está oculto mientras el reloj está detenido.
          </p>
          <Button onClick={() => game.setIsPaused(false)}>
            <PlayIcon data-icon="inline-start" />
            Reanudar partida
          </Button>
        </div>
      )}
    </div>
  )
}
