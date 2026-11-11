'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
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
const BASE_TILE_HEIGHT = 0.24

function getCellCoord(rc: number): number {
  return (rc - 4) * CELL_STEP + (Math.floor(rc / 3) - 1) * BOX_GAP
}

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

const PRESET_VECTORS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  isometric: { pos: [0, 13.0, 9.1], target: [0, -0.1, 0.2] },
  top: { pos: [0, 16.0, 0.5], target: [0, 0, 0] },
  angled: { pos: [7.6, 12.2, 8.8], target: [0, -0.1, 0.1] },
}

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

function getTileLabelTexture(
  params: LabelTextureParams
): THREE.CanvasTexture | null {
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
    digit === 0 &&
    highlightNoteDigit !== null &&
    hasNote(notesMask, highlightNoteDigit)
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

function getCoordTexture(
  label: string,
  isDark: boolean
): THREE.CanvasTexture | null {
  const key = `${label}|${isDark ? 1 : 0}`
  const cached = coordTextureCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, 128, 128)
  ctx.fillStyle = isDark
    ? 'rgba(148, 163, 184, 0.85)'
    : 'rgba(51, 65, 85, 0.85)'
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

function check3DSupport(): {
  supported: boolean
  hasWebGL2: boolean
} {
  if (typeof window === 'undefined') {
    return { supported: true, hasWebGL2: true }
  }
  try {
    const p2 = document.createElement('canvas')
    const hasWebGL2 = Boolean(p2.getContext('webgl2'))
    if (hasWebGL2) {
      return { supported: true, hasWebGL2: true }
    }
    const p1 = document.createElement('canvas')
    const hasWebGL1 = Boolean(
      p1.getContext('webgl') || p1.getContext('experimental-webgl')
    )
    return { supported: hasWebGL1, hasWebGL2: false }
  } catch {
    return { supported: false, hasWebGL2: false }
  }
}

interface TileEntry {
  index: number
  row: number
  col: number
  altQuadrant: boolean
  group: THREE.Group
  tileMesh: THREE.Mesh<RoundedBoxGeometry, THREE.MeshStandardMaterial>
  labelMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  ringMesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  currentScaleY: number
  targetScaleY: number
  isConflict: boolean
  isSelected: boolean
  isGiven: boolean
}

interface SceneRegistry {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  ambientLight: THREE.AmbientLight
  keyLight: THREE.DirectionalLight
  rimLight: THREE.DirectionalLight
  plinthMat: THREE.MeshStandardMaterial
  rimMat: THREE.MeshStandardMaterial
  subPlateMats: { alt: THREE.MeshStandardMaterial; std: THREE.MeshStandardMaterial }
  rowCoordMeshes: Array<{ label: string; mat: THREE.MeshBasicMaterial }>
  colCoordMeshes: Array<{ label: string; mat: THREE.MeshBasicMaterial }>
  tilesGroup: THREE.Group
  tiles: TileEntry[]
  hoveredIndex: number | null
  animatingCamera: boolean
  desiredCamPos: THREE.Vector3
  desiredCamTarget: THREE.Vector3
  aspect: number
  isWon: boolean
  reliefMode: boolean
  boardDigits: number[]
}

function applyCameraPresetTarget(
  reg: SceneRegistry,
  preset: CameraPreset
): void {
  const config = PRESET_VECTORS[preset]
  const portraitZoomOut =
    reg.aspect < 1.15 ? Math.min(1.62, 1.28 / Math.max(0.55, reg.aspect)) : 1
  reg.desiredCamPos.set(...config.pos).multiplyScalar(portraitZoomOut)
  reg.desiredCamTarget.set(...config.target)
  reg.animatingCamera = true
}

function updateSingleTileVisuals(
  tile: TileEntry,
  params: {
    digit: number
    notesMask: number
    isGiven: boolean
    isSelected: boolean
    isPeer: boolean
    isConflict: boolean
    isSameDigit: boolean
    isLastHint: boolean
    isHovered: boolean
    highlightNoteDigit: number | null
    reliefMode: boolean
    isDark: boolean
  }
): void {
  const {
    digit,
    notesMask,
    isGiven,
    isSelected,
    isPeer,
    isConflict,
    isSameDigit,
    isLastHint,
    isHovered,
    highlightNoteDigit,
    reliefMode,
    isDark,
  } = params

  tile.isConflict = isConflict
  tile.isSelected = isSelected
  tile.isGiven = isGiven

  let tileColorHex: string
  if (isSelected) {
    tileColorHex = isDark ? '#2563eb' : '#1d4ed8'
  } else if (isConflict) {
    tileColorHex = isDark ? '#7f1d1d' : '#fee2e2'
  } else if (isLastHint) {
    tileColorHex = isDark ? '#78350f' : '#fef3c7'
  } else if (isSameDigit) {
    tileColorHex = isDark ? '#1e3a8a' : '#dbeafe'
  } else if (isHovered) {
    tileColorHex = isDark ? '#293850' : '#e2e8f0'
  } else if (isPeer) {
    tileColorHex = isDark ? '#1c2940' : '#eaf0f8'
  } else if (isGiven) {
    tileColorHex = tile.altQuadrant
      ? isDark
        ? '#1e2f48'
        : '#e2e8f0'
      : isDark
        ? '#273954'
        : '#f1f5f9'
  } else {
    tileColorHex = tile.altQuadrant
      ? isDark
        ? '#152236'
        : '#f8fafc'
      : isDark
        ? '#1d2d44'
        : '#ffffff'
  }

  let emissiveHex = '#000000'
  let emissiveIntensity = 0
  if (isSelected) {
    emissiveHex = '#3b82f6'
    emissiveIntensity = isDark ? 0.35 : 0.2
  } else if (isConflict) {
    emissiveHex = '#ef4444'
    emissiveIntensity = isDark ? 0.3 : 0.12
  } else if (isLastHint) {
    emissiveHex = '#f59e0b'
    emissiveIntensity = 0.38
  } else if (isSameDigit) {
    emissiveHex = '#3b82f6'
    emissiveIntensity = isDark ? 0.22 : 0.08
  }

  const mat = tile.tileMesh.material
  mat.color.set(tileColorHex)
  mat.emissive.set(emissiveHex)
  mat.emissiveIntensity = emissiveIntensity
  mat.roughness = isSelected ? 0.24 : isGiven ? 0.34 : 0.42
  mat.metalness = isDark ? 0.18 : 0.06

  // Target Y scale for smooth 3D tower animation
  let targetHeight = BASE_TILE_HEIGHT
  if (reliefMode && digit > 0) {
    targetHeight = 0.22 + digit * 0.088
  } else if (digit > 0) {
    targetHeight = isGiven ? 0.3 : 0.26
  }
  if (isSelected) {
    targetHeight += 0.14
  } else if (isHovered) {
    targetHeight += 0.05
  }
  tile.targetScaleY = targetHeight / BASE_TILE_HEIGHT

  // Top label texture (digit or 3x3 candidate notes)
  const labelTex = getTileLabelTexture({
    digit,
    notesMask,
    isGiven,
    isConflict,
    isSelected,
    isSameDigit,
    highlightNoteDigit,
    isDark,
  })
  if (labelTex) {
    tile.labelMesh.material.map = labelTex
    tile.labelMesh.material.needsUpdate = true
    tile.labelMesh.visible = true
  } else {
    tile.labelMesh.visible = false
  }

  // Active selection ring
  tile.ringMesh.visible = isSelected
  if (isSelected) {
    tile.ringMesh.material.color.set(isDark ? '#60a5fa' : '#2563eb')
  }
}

export function SudokuBoard3D({ game }: { game: SudokuGameController }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const registryRef = useRef<SceneRegistry | null>(null)
  const selectCellRef = useRef(game.selectCell)
  selectCellRef.current = game.selectCell
  const gameRef = useRef(game)
  gameRef.current = game
  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark

  const [support, setSupport] = useState<{
    ready: boolean
    supported: boolean
    hasWebGL2: boolean
  }>({
    ready: false,
    supported: true,
    hasWebGL2: true,
  })

  useEffect(() => {
    const res = check3DSupport()
    setSupport({ ready: true, ...res })
  }, [])

  // Build Three.js scene once when WebGL support is confirmed
  useEffect(() => {
    if (!support.ready || !support.supported) return
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const scene = new THREE.Scene()
    const initialBg = isDarkRef.current ? '#0e1422' : '#eef2f7'
    scene.background = new THREE.Color(initialBg)
    scene.fog = new THREE.Fog(initialBg, 22, 40)

    const rect = container.getBoundingClientRect()
    const initialWidth = Math.max(1, rect.width)
    const initialHeight = Math.max(1, rect.height)
    const initialAspect = initialWidth / initialHeight

    const camera = new THREE.PerspectiveCamera(42, initialAspect, 0.5, 75)
    camera.position.set(...PRESET_VECTORS.isometric.pos)

    let renderer: THREE.WebGLRenderer
    if (support.hasWebGL2) {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      })
    } else {
      const LegacyWebGL1 = (
        THREE as unknown as { WebGL1Renderer: typeof THREE.WebGLRenderer }
      ).WebGL1Renderer
      renderer = new LegacyWebGL1({
        canvas,
        antialias: true,
      })
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(initialWidth, initialHeight, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const controls = new OrbitControls(camera, canvas)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 8.8
    controls.maxDistance = 26
    controls.minPolarAngle = 0.04
    controls.maxPolarAngle = 1.16
    controls.rotateSpeed = 0.72
    controls.zoomSpeed = 0.85

    // Lighting
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      isDarkRef.current ? 0.75 : 0.94
    )
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(
      0xffffff,
      isDarkRef.current ? 1.35 : 1.15
    )
    keyLight.position.set(8, 16, 10)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    keyLight.shadow.camera.left = -7
    keyLight.shadow.camera.right = 7
    keyLight.shadow.camera.top = 7
    keyLight.shadow.camera.bottom = -7
    keyLight.shadow.bias = -0.0005
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(
      isDarkRef.current ? '#60a5fa' : '#93c5fd',
      isDarkRef.current ? 0.55 : 0.4
    )
    rimLight.position.set(-8, 9, -7)
    scene.add(rimLight)

    // Sculpted Board Pedestal
    const disposables: Array<{ dispose: () => void }> = []

    const plinthGeo = new RoundedBoxGeometry(10.6, 0.56, 10.6, 4, 0.22)
    const plinthMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? '#0b101d' : '#cbd5e1',
      roughness: 0.45,
      metalness: isDarkRef.current ? 0.35 : 0.08,
    })
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat)
    plinthMesh.position.set(0, -0.1, 0)
    plinthMesh.receiveShadow = true
    scene.add(plinthMesh)
    disposables.push(plinthGeo, plinthMat)

    const rimGeo = new RoundedBoxGeometry(10.72, 0.14, 10.72, 4, 0.06)
    const rimMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? '#1d4ed8' : '#94a3b8',
      emissive: isDarkRef.current ? '#1d4ed8' : '#000000',
      emissiveIntensity: isDarkRef.current ? 0.25 : 0,
      roughness: 0.3,
      metalness: 0.4,
    })
    const rimMesh = new THREE.Mesh(rimGeo, rimMat)
    rimMesh.position.set(0, -0.32, 0)
    scene.add(rimMesh)
    disposables.push(rimGeo, rimMat)

    // 9 Recessed 3x3 Sub-Plates
    const subPlateGeo = new RoundedBoxGeometry(3.12, 0.08, 3.12, 3, 0.04)
    const subPlateMatAlt = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? '#0f172a' : '#dbe3ee',
      roughness: 0.55,
      metalness: 0.15,
    })
    const subPlateMatStd = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? '#131d31' : '#e2e8f0',
      roughness: 0.55,
      metalness: 0.15,
    })
    disposables.push(subPlateGeo, subPlateMatAlt, subPlateMatStd)

    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const cx = (bc - 1) * (3 * CELL_STEP + BOX_GAP)
        const cz = (br - 1) * (3 * CELL_STEP + BOX_GAP)
        const isAlt = (br + bc) % 2 === 1
        const subMesh = new THREE.Mesh(
          subPlateGeo,
          isAlt ? subPlateMatAlt : subPlateMatStd
        )
        subMesh.position.set(cx, 0.19, cz)
        subMesh.receiveShadow = true
        scene.add(subMesh)
      }
    }

    // Engraved Row (A-I) & Column (1-9) Coordinate Plates
    const coordGeo = new THREE.PlaneGeometry(0.42, 0.42)
    disposables.push(coordGeo)

    const rowCoordMeshes: Array<{ label: string; mat: THREE.MeshBasicMaterial }> =
      []
    const colCoordMeshes: Array<{ label: string; mat: THREE.MeshBasicMaterial }> =
      []

    ROW_LABELS.forEach((label, r) => {
      const mat = new THREE.MeshBasicMaterial({
        map: getCoordTexture(label, isDarkRef.current),
        transparent: true,
        depthWrite: false,
      })
      const m = new THREE.Mesh(coordGeo, mat)
      m.position.set(-4.96, 0.2, getCellCoord(r))
      m.rotation.set(-Math.PI / 2, 0, 0)
      scene.add(m)
      rowCoordMeshes.push({ label, mat })
      disposables.push(mat)
    })

    for (let c = 0; c < 9; c++) {
      const label = String(c + 1)
      const mat = new THREE.MeshBasicMaterial({
        map: getCoordTexture(label, isDarkRef.current),
        transparent: true,
        depthWrite: false,
      })
      const m = new THREE.Mesh(coordGeo, mat)
      m.position.set(getCellCoord(c), 0.2, 4.96)
      m.rotation.set(-Math.PI / 2, 0, 0)
      scene.add(m)
      colCoordMeshes.push({ label, mat })
      disposables.push(mat)
    }

    // 81 Interactive 3D Sudoku Tiles
    const sharedTileGeo = new RoundedBoxGeometry(
      0.92,
      BASE_TILE_HEIGHT,
      0.92,
      3,
      0.08
    )
    const sharedLabelGeo = new THREE.PlaneGeometry(0.78, 0.78)
    const sharedRingGeo = new THREE.RingGeometry(0.45, 0.5, 32)
    disposables.push(sharedTileGeo, sharedLabelGeo, sharedRingGeo)

    const tilesGroup = new THREE.Group()
    scene.add(tilesGroup)

    const tiles: TileEntry[] = []
    const raycastTargets: THREE.Mesh[] = []

    for (let idx = 0; idx < 81; idx++) {
      const row = Math.floor(idx / 9)
      const col = idx % 9
      const altQuadrant =
        (Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 1

      const group = new THREE.Group()
      group.position.set(getCellCoord(col), 0.22, getCellCoord(row))
      tilesGroup.add(group)

      const tileMat = new THREE.MeshStandardMaterial({
        color: '#1d2d44',
        roughness: 0.4,
        metalness: 0.18,
      })
      const tileMesh = new THREE.Mesh(sharedTileGeo, tileMat)
      tileMesh.position.set(0, BASE_TILE_HEIGHT / 2, 0)
      tileMesh.castShadow = true
      tileMesh.receiveShadow = true
      tileMesh.userData.tileIndex = idx
      group.add(tileMesh)
      raycastTargets.push(tileMesh)
      disposables.push(tileMat)

      const labelMat = new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
      const labelMesh = new THREE.Mesh(sharedLabelGeo, labelMat)
      labelMesh.position.set(0, BASE_TILE_HEIGHT + 0.006, 0)
      labelMesh.rotation.set(-Math.PI / 2, 0, 0)
      labelMesh.visible = false
      group.add(labelMesh)
      disposables.push(labelMat)

      const ringMat = new THREE.MeshBasicMaterial({
        color: '#60a5fa',
        side: THREE.DoubleSide,
      })
      const ringMesh = new THREE.Mesh(sharedRingGeo, ringMat)
      ringMesh.position.set(0, 0.012, 0)
      ringMesh.rotation.set(-Math.PI / 2, 0, 0)
      ringMesh.visible = false
      group.add(ringMesh)
      disposables.push(ringMat)

      tiles.push({
        index: idx,
        row,
        col,
        altQuadrant,
        group,
        tileMesh,
        labelMesh,
        ringMesh,
        currentScaleY: 1,
        targetScaleY: 1,
        isConflict: false,
        isSelected: false,
        isGiven: false,
      })
    }

    const registry: SceneRegistry = {
      scene,
      camera,
      renderer,
      controls,
      ambientLight,
      keyLight,
      rimLight,
      plinthMat,
      rimMat,
      subPlateMats: { alt: subPlateMatAlt, std: subPlateMatStd },
      rowCoordMeshes,
      colCoordMeshes,
      tilesGroup,
      tiles,
      hoveredIndex: null,
      animatingCamera: true,
      desiredCamPos: new THREE.Vector3(...PRESET_VECTORS.isometric.pos),
      desiredCamTarget: new THREE.Vector3(...PRESET_VECTORS.isometric.target),
      aspect: initialAspect,
      isWon: gameRef.current.isWon,
      reliefMode: gameRef.current.reliefMode,
      boardDigits: [...gameRef.current.board],
    }
    registryRef.current = registry

    applyCameraPresetTarget(registry, gameRef.current.cameraPreset)
    camera.position.copy(registry.desiredCamPos)
    controls.target.copy(registry.desiredCamTarget)
    controls.update()

    // Initial full state paint before first frame
    const g = gameRef.current
    tilesGroup.visible = !g.isPaused
    for (let idx = 0; idx < 81; idx++) {
      const digit = g.board[idx]
      const isSelected = g.selectedIndex === idx
      const isSameDigit =
        digit !== 0 &&
        g.activeHighlightDigit !== null &&
        digit === g.activeHighlightDigit &&
        !isSelected
      updateSingleTileVisuals(tiles[idx], {
        digit,
        notesMask: g.notes[idx],
        isGiven: g.initialBoard[idx] !== 0,
        isSelected,
        isPeer: g.peerSet.has(idx),
        isConflict: g.conflicts.has(idx),
        isSameDigit,
        isLastHint: g.lastHintIndex === idx,
        isHovered: false,
        highlightNoteDigit: g.activeHighlightDigit,
        reliefMode: g.reliefMode,
        isDark: isDarkRef.current,
      })
      tiles[idx].currentScaleY = tiles[idx].targetScaleY
      const h = BASE_TILE_HEIGHT * tiles[idx].currentScaleY
      tiles[idx].tileMesh.scale.y = tiles[idx].currentScaleY
      tiles[idx].tileMesh.position.y = h / 2
      tiles[idx].labelMesh.position.y = h + 0.006
    }

    const onControlStart = () => {
      registry.animatingCamera = false
    }
    controls.addEventListener('start', onControlStart)

    // Raycasting for pointer hover & click/tap cell selection
    const raycaster = new THREE.Raycaster()
    const pointerNdc = new THREE.Vector2()
    let downX = 0
    let downY = 0

    const pickTileIndex = (clientX: number, clientY: number): number | null => {
      if (gameRef.current.isPaused) return null
      const bounds = canvas.getBoundingClientRect()
      if (bounds.width <= 0 || bounds.height <= 0) return null
      pointerNdc.x = ((clientX - bounds.left) / bounds.width) * 2 - 1
      pointerNdc.y = -((clientY - bounds.top) / bounds.height) * 2 + 1
      raycaster.setFromCamera(pointerNdc, camera)
      const hits = raycaster.intersectObjects(raycastTargets, false)
      if (hits.length === 0) return null
      const hitIdx = hits[0].object.userData.tileIndex
      return typeof hitIdx === 'number' ? hitIdx : null
    }

    const syncSingleHoverTile = (tileIdx: number, isHovered: boolean) => {
      const currGame = gameRef.current
      const d = currGame.board[tileIdx]
      const sel = currGame.selectedIndex === tileIdx
      const same =
        d !== 0 &&
        currGame.activeHighlightDigit !== null &&
        d === currGame.activeHighlightDigit &&
        !sel
      updateSingleTileVisuals(tiles[tileIdx], {
        digit: d,
        notesMask: currGame.notes[tileIdx],
        isGiven: currGame.initialBoard[tileIdx] !== 0,
        isSelected: sel,
        isPeer: currGame.peerSet.has(tileIdx),
        isConflict: currGame.conflicts.has(tileIdx),
        isSameDigit: same,
        isLastHint: currGame.lastHintIndex === tileIdx,
        isHovered,
        highlightNoteDigit: currGame.activeHighlightDigit,
        reliefMode: currGame.reliefMode,
        isDark: isDarkRef.current,
      })
    }

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX
      downY = e.clientY
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const hit = pickTileIndex(e.clientX, e.clientY)
      if (hit !== registry.hoveredIndex) {
        const prev = registry.hoveredIndex
        registry.hoveredIndex = hit
        if (prev !== null) syncSingleHoverTile(prev, false)
        if (hit !== null) syncSingleHoverTile(hit, true)
        canvas.style.cursor = hit !== null ? 'pointer' : 'grab'
      }
    }

    const onPointerLeave = () => {
      const prev = registry.hoveredIndex
      if (prev !== null) {
        registry.hoveredIndex = null
        syncSingleHoverTile(prev, false)
      }
      canvas.style.cursor = 'grab'
    }

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY)
      if (dist > 8) return
      const hit = pickTileIndex(e.clientX, e.clientY)
      if (hit !== null) {
        selectCellRef.current(hit)
      }
    }

    canvas.style.cursor = 'grab'
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('pointerup', onPointerUp)

    // Responsive ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const w = Math.max(1, entry.contentRect.width)
      const h = Math.max(1, entry.contentRect.height)
      const nextAspect = w / h
      camera.aspect = nextAspect
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
      if (Math.abs(nextAspect - registry.aspect) > 0.05) {
        registry.aspect = nextAspect
        applyCameraPresetTarget(registry, gameRef.current.cameraPreset)
      }
    })
    resizeObserver.observe(container)

    // 60fps Animation Loop
    let rafId = 0
    let prevTime = performance.now()

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate)
      const delta = Math.min(0.1, (now - prevTime) / 1000)
      prevTime = now
      const elapsed = now / 1000

      if (registry.animatingCamera) {
        const camDamp = 1 - Math.exp(-7.5 * delta)
        camera.position.lerp(registry.desiredCamPos, camDamp)
        controls.target.lerp(registry.desiredCamTarget, camDamp)
        if (
          camera.position.distanceTo(registry.desiredCamPos) < 0.04 &&
          controls.target.distanceTo(registry.desiredCamTarget) < 0.04
        ) {
          registry.animatingCamera = false
        }
      }
      controls.update()

      const tileDamp = 1 - Math.exp(-12 * delta)
      for (let i = 0; i < 81; i++) {
        const tEntry = tiles[i]
        let goalScaleY = tEntry.targetScaleY
        if (registry.isWon) {
          const wave =
            Math.sin(elapsed * 3.4 - (tEntry.row + tEntry.col) * 0.45) * 0.09
          goalScaleY = Math.max(0.7, goalScaleY + wave / BASE_TILE_HEIGHT)
        }

        if (Math.abs(tEntry.currentScaleY - goalScaleY) > 0.001) {
          tEntry.currentScaleY = THREE.MathUtils.lerp(
            tEntry.currentScaleY,
            goalScaleY,
            tileDamp
          )
          const h = BASE_TILE_HEIGHT * tEntry.currentScaleY
          tEntry.tileMesh.scale.y = tEntry.currentScaleY
          tEntry.tileMesh.position.y = h / 2
          tEntry.labelMesh.position.y = h + 0.006
        }

        const baseX = getCellCoord(tEntry.col)
        if (tEntry.isConflict) {
          tEntry.group.position.x = baseX + Math.sin(elapsed * 28) * 0.024
        } else if (Math.abs(tEntry.group.position.x - baseX) > 0.0005) {
          tEntry.group.position.x = THREE.MathUtils.lerp(
            tEntry.group.position.x,
            baseX,
            tileDamp
          )
        }
      }

      renderer.render(scene, camera)
    }

    rafId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      controls.removeEventListener('start', onControlStart)
      controls.dispose()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('pointerup', onPointerUp)
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      registryRef.current = null
    }
  }, [support.ready, support.supported, support.hasWebGL2])

  // Sync Dark / Light Theme to Scene Lights & Pedestal
  useEffect(() => {
    const reg = registryRef.current
    if (!reg) return

    const bgHex = isDark ? '#0e1422' : '#eef2f7'
    reg.scene.background = new THREE.Color(bgHex)
    reg.scene.fog = new THREE.Fog(bgHex, 22, 40)
    reg.ambientLight.intensity = isDark ? 0.75 : 0.94
    reg.keyLight.intensity = isDark ? 1.35 : 1.15
    reg.rimLight.color.set(isDark ? '#60a5fa' : '#93c5fd')
    reg.rimLight.intensity = isDark ? 0.55 : 0.4

    reg.plinthMat.color.set(isDark ? '#0b101d' : '#cbd5e1')
    reg.plinthMat.metalness = isDark ? 0.35 : 0.08
    reg.rimMat.color.set(isDark ? '#1d4ed8' : '#94a3b8')
    reg.rimMat.emissive.set(isDark ? '#1d4ed8' : '#000000')
    reg.rimMat.emissiveIntensity = isDark ? 0.25 : 0

    reg.subPlateMats.alt.color.set(isDark ? '#0f172a' : '#dbe3ee')
    reg.subPlateMats.std.color.set(isDark ? '#131d31' : '#e2e8f0')

    reg.rowCoordMeshes.forEach(({ label, mat }) => {
      mat.map = getCoordTexture(label, isDark)
      mat.needsUpdate = true
    })
    reg.colCoordMeshes.forEach(({ label, mat }) => {
      mat.map = getCoordTexture(label, isDark)
      mat.needsUpdate = true
    })
  }, [isDark])

  // Sync Camera Presets & Reset Trigger
  useEffect(() => {
    const reg = registryRef.current
    if (!reg) return
    applyCameraPresetTarget(reg, game.cameraPreset)
  }, [game.cameraPreset, game.cameraResetTick])

  // Sync 81 Sudoku Tiles State
  useEffect(() => {
    const reg = registryRef.current
    if (!reg) return

    reg.tilesGroup.visible = !game.isPaused
    reg.isWon = game.isWon
    reg.reliefMode = game.reliefMode
    reg.boardDigits = game.board

    if (game.isPaused) return

    for (let idx = 0; idx < 81; idx++) {
      const digit = game.board[idx]
      const isSelected = game.selectedIndex === idx
      const isSameDigit =
        digit !== 0 &&
        game.activeHighlightDigit !== null &&
        digit === game.activeHighlightDigit &&
        !isSelected

      updateSingleTileVisuals(reg.tiles[idx], {
        digit,
        notesMask: game.notes[idx],
        isGiven: game.initialBoard[idx] !== 0,
        isSelected,
        isPeer: game.peerSet.has(idx),
        isConflict: game.conflicts.has(idx),
        isSameDigit,
        isLastHint: game.lastHintIndex === idx,
        isHovered: reg.hoveredIndex === idx,
        highlightNoteDigit: game.activeHighlightDigit,
        reliefMode: game.reliefMode,
        isDark,
      })
    }
  }, [
    game.board,
    game.initialBoard,
    game.notes,
    game.selectedIndex,
    game.peerSet,
    game.conflicts,
    game.activeHighlightDigit,
    game.lastHintIndex,
    game.reliefMode,
    game.isPaused,
    game.isWon,
    isDark,
  ])

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
          Cambia al modo 2D Clásico para continuar tu partida con el mismo
          progreso.
        </p>
        <Button onClick={() => game.setMode('2d')}>Abrir Modo 2D Clásico</Button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-[39dvh] max-h-[360px] min-h-[260px] w-full shrink-0 overflow-hidden rounded-2xl border bg-card shadow-xs sm:h-[48dvh] sm:max-h-[470px] lg:h-[calc(100dvh-5.5rem)] lg:max-h-[780px] lg:min-h-[420px] lg:flex-1"
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

      {/* Native Three.js WebGL Canvas */}
      {support.ready && (
        <canvas
          ref={canvasRef}
          aria-label="Tablero de Sudoku 3D interactivo en Three.js"
          className="block h-full w-full touch-none outline-none"
        />
      )}

      {/* Pause Veil */}
      {game.isPaused && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-md">
          <p className="text-lg font-semibold tracking-tight">
            Partida en pausa
          </p>
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
