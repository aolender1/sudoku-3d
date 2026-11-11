'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BLANK_CHAR,
  createSudokuGame,
  get_candidates,
  type DifficultyKey,
} from '@/lib/sudoku-js'
import { playTileSound } from '@/lib/sound-fx'

export type ViewMode = '3d' | '2d'
export type CameraPreset = 'isometric' | 'top' | 'angled'

interface HistoryEntry {
  board: number[]
  notes: number[]
}

export function hasNote(mask: number, digit: number): boolean {
  return (mask & (1 << digit)) !== 0
}

export function toggleNoteBit(mask: number, digit: number): number {
  return mask ^ (1 << digit)
}

export function clearNoteBit(mask: number, digit: number): number {
  return mask & ~(1 << digit)
}

export function getPeerIndices(index: number): number[] {
  const row = Math.floor(index / 9)
  const col = index % 9
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  const peers = new Set<number>()

  for (let i = 0; i < 9; i++) {
    const rIdx = row * 9 + i
    const cIdx = i * 9 + col
    if (rIdx !== index) peers.add(rIdx)
    if (cIdx !== index) peers.add(cIdx)
  }

  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      const bIdx = r * 9 + c
      if (bIdx !== index) peers.add(bIdx)
    }
  }

  return Array.from(peers)
}

const PEERS_TABLE: number[][] = Array.from({ length: 81 }, (_, i) =>
  getPeerIndices(i)
)

function computeConflicts(board: number[], solution: number[]): Set<number> {
  const conflicts = new Set<number>()

  for (let i = 0; i < 81; i++) {
    const val = board[i]
    if (val === 0) continue

    if (solution[i] !== 0 && val !== solution[i]) {
      conflicts.add(i)
    }

    for (const peer of PEERS_TABLE[i]) {
      if (board[peer] === val) {
        conflicts.add(i)
        conflicts.add(peer)
      }
    }
  }

  return conflicts
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// Deterministic starter fallback before client hydration generates fresh random game
const INITIAL_PLACEHOLDER = Array.from({ length: 81 }, () => 0)

export function useSudokuGame() {
  const [isReady, setIsReady] = useState(false)
  const [mode, setMode] = useState<ViewMode>('3d')
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric')
  const [cameraResetTick, setCameraResetTick] = useState(0)
  const [reliefMode, setReliefMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const [difficulty, setDifficulty] = useState<DifficultyKey>('medium')
  const [initialBoard, setInitialBoard] = useState<number[]>(INITIAL_PLACEHOLDER)
  const [board, setBoard] = useState<number[]>(INITIAL_PLACEHOLDER)
  const [solution, setSolution] = useState<number[]>(INITIAL_PLACEHOLDER)
  const [notes, setNotes] = useState<number[]>(INITIAL_PLACEHOLDER)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [lastHintIndex, setLastHintIndex] = useState<number | null>(null)
  const [isNotesMode, setIsNotesMode] = useState(false)
  const [lockedDigit, setLockedDigit] = useState<number | null>(null)

  const [mistakes, setMistakes] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isWon, setIsWon] = useState(false)

  const startNewGame = useCallback((nextDifficulty: DifficultyKey) => {
    const generated = createSudokuGame(nextDifficulty)
    setDifficulty(nextDifficulty)
    setInitialBoard(generated.initialBoard)
    setBoard([...generated.initialBoard])
    setSolution(generated.solutionBoard)
    setNotes(Array.from({ length: 81 }, () => 0))
    setHistory([])
    const firstEmpty = generated.initialBoard.findIndex((v) => v === 0)
    setSelectedIndex(firstEmpty >= 0 ? firstEmpty : 40)
    setLastHintIndex(null)
    setIsNotesMode(false)
    setLockedDigit(null)
    setMistakes(0)
    setHintsUsed(0)
    setElapsedSeconds(0)
    setIsPaused(false)
    setIsWon(false)
    setIsReady(true)
  }, [])

  useEffect(() => {
    startNewGame('medium')
  }, [startNewGame])

  // Timer tick
  useEffect(() => {
    if (!isReady || isPaused || isWon) return
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isReady, isPaused, isWon])

  const conflicts = useMemo(
    () => computeConflicts(board, solution),
    [board, solution]
  )

  const peerSet = useMemo(() => {
    if (selectedIndex === null) return new Set<number>()
    return new Set<number>(PEERS_TABLE[selectedIndex])
  }, [selectedIndex])

  const activeHighlightDigit = useMemo(() => {
    if (lockedDigit !== null) return lockedDigit
    if (selectedIndex !== null && board[selectedIndex] !== 0) {
      return board[selectedIndex]
    }
    return null
  }, [lockedDigit, selectedIndex, board])

  const remainingDigits = useMemo(() => {
    const counts: Record<number, number> = {
      1: 9,
      2: 9,
      3: 9,
      4: 9,
      5: 9,
      6: 9,
      7: 9,
      8: 9,
      9: 9,
    }
    for (let i = 0; i < 81; i++) {
      const val = board[i]
      if (val >= 1 && val <= 9 && val === solution[i]) {
        counts[val] = Math.max(0, counts[val] - 1)
      }
    }
    return counts
  }, [board, solution])

  const filledCorrectCount = useMemo(() => {
    let count = 0
    for (let i = 0; i < 81; i++) {
      if (board[i] !== 0 && board[i] === solution[i]) count++
    }
    return count
  }, [board, solution])

  const checkVictory = useCallback(
    (nextBoard: number[]) => {
      for (let i = 0; i < 81; i++) {
        if (nextBoard[i] === 0 || nextBoard[i] !== solution[i]) {
          return false
        }
      }
      return true
    },
    [solution]
  )

  const applyDigitAt = useCallback(
    (targetIndex: number, digit: number, notesModeOverride?: boolean) => {
      if (!isReady || isPaused || isWon) return
      if (initialBoard[targetIndex] !== 0) return

      const useNotes = notesModeOverride ?? isNotesMode

      if (useNotes) {
        if (board[targetIndex] !== 0) return
        setHistory((prev) => [
          ...prev.slice(-60),
          { board: [...board], notes: [...notes] },
        ])
        setNotes((prev) => {
          const next = [...prev]
          next[targetIndex] = toggleNoteBit(next[targetIndex], digit)
          return next
        })
        playTileSound('note', soundEnabled)
        return
      }

      // Toggle off if pressing same digit already placed
      if (board[targetIndex] === digit) {
        setHistory((prev) => [
          ...prev.slice(-60),
          { board: [...board], notes: [...notes] },
        ])
        const nextBoard = [...board]
        nextBoard[targetIndex] = 0
        setBoard(nextBoard)
        playTileSound('erase', soundEnabled)
        return
      }

      setHistory((prev) => [
        ...prev.slice(-60),
        { board: [...board], notes: [...notes] },
      ])

      const nextBoard = [...board]
      nextBoard[targetIndex] = digit

      const nextNotes = [...notes]
      nextNotes[targetIndex] = 0

      const isCorrect = solution[targetIndex] === digit
      if (isCorrect) {
        // Auto-clean matching pencil notes in row, column, and 3x3 box
        for (const peer of PEERS_TABLE[targetIndex]) {
          nextNotes[peer] = clearNoteBit(nextNotes[peer], digit)
        }
      } else {
        setMistakes((m) => m + 1)
      }

      setBoard(nextBoard)
      setNotes(nextNotes)
      setLastHintIndex(null)

      if (checkVictory(nextBoard)) {
        setIsWon(true)
        playTileSound('win', soundEnabled)
      } else {
        playTileSound(isCorrect ? 'place' : 'error', soundEnabled)
      }
    },
    [
      isReady,
      isPaused,
      isWon,
      initialBoard,
      isNotesMode,
      board,
      notes,
      solution,
      soundEnabled,
      checkVictory,
    ]
  )

  const selectCell = useCallback(
    (index: number) => {
      if (!isReady || isPaused) return
      setSelectedIndex(index)
      if (lockedDigit !== null && initialBoard[index] === 0 && !isWon) {
        applyDigitAt(index, lockedDigit)
      } else {
        playTileSound('select', soundEnabled)
      }
    },
    [isReady, isPaused, lockedDigit, initialBoard, isWon, applyDigitAt, soundEnabled]
  )

  const inputDigit = useCallback(
    (digit: number) => {
      if (!isReady || isPaused || isWon) return
      if (lockedDigit !== null) {
        setLockedDigit((prev) => (prev === digit ? null : digit))
        playTileSound('select', soundEnabled)
        return
      }
      if (selectedIndex === null) return
      applyDigitAt(selectedIndex, digit)
    },
    [isReady, isPaused, isWon, lockedDigit, selectedIndex, applyDigitAt, soundEnabled]
  )

  const eraseCell = useCallback(() => {
    if (!isReady || isPaused || isWon || selectedIndex === null) return
    if (initialBoard[selectedIndex] !== 0) return
    if (board[selectedIndex] === 0 && notes[selectedIndex] === 0) return

    setHistory((prev) => [
      ...prev.slice(-60),
      { board: [...board], notes: [...notes] },
    ])
    const nextBoard = [...board]
    const nextNotes = [...notes]
    nextBoard[selectedIndex] = 0
    nextNotes[selectedIndex] = 0
    setBoard(nextBoard)
    setNotes(nextNotes)
    playTileSound('erase', soundEnabled)
  }, [isReady, isPaused, isWon, selectedIndex, initialBoard, board, notes, soundEnabled])

  const undo = useCallback(() => {
    if (!isReady || isPaused || isWon || history.length === 0) return
    const previous = history[history.length - 1]
    setBoard(previous.board)
    setNotes(previous.notes)
    setHistory((prev) => prev.slice(0, -1))
    playTileSound('erase', soundEnabled)
  }, [isReady, isPaused, isWon, history, soundEnabled])

  const resetCurrentBoard = useCallback(() => {
    if (!isReady) return
    setBoard([...initialBoard])
    setNotes(Array.from({ length: 81 }, () => 0))
    setHistory([])
    setMistakes(0)
    setHintsUsed(0)
    setElapsedSeconds(0)
    setIsPaused(false)
    setIsWon(false)
    setLastHintIndex(null)
    playTileSound('select', soundEnabled)
  }, [isReady, initialBoard, soundEnabled])

  // Uses robatron/sudoku.js get_candidates() to populate valid pencil marks!
  const fillSmartCandidates = useCallback(() => {
    if (!isReady || isPaused || isWon) return

    // Build sanitized board string (using only correct/given digits so wrong guesses don't break propagation)
    const sanitizedString = board
      .map((val, idx) =>
        val !== 0 && val === solution[idx] ? String(val) : BLANK_CHAR
      )
      .join('')

    const candidateGrid = get_candidates(sanitizedString)
    if (!candidateGrid) return

    setHistory((prev) => [
      ...prev.slice(-60),
      { board: [...board], notes: [...notes] },
    ])

    const nextNotes = [...notes]
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const idx = r * 9 + c
        if (board[idx] !== 0) {
          nextNotes[idx] = 0
          continue
        }
        let mask = 0
        const candStr = candidateGrid[r][c]
        for (let k = 0; k < candStr.length; k++) {
          const d = Number(candStr[k])
          if (d >= 1 && d <= 9) {
            mask |= 1 << d
          }
        }
        nextNotes[idx] = mask
      }
    }

    setNotes(nextNotes)
    playTileSound('hint', soundEnabled)
  }, [isReady, isPaused, isWon, board, solution, notes, soundEnabled])

  const useHint = useCallback(() => {
    if (!isReady || isPaused || isWon) return

    let target = selectedIndex
    if (
      target === null ||
      initialBoard[target] !== 0 ||
      board[target] === solution[target]
    ) {
      // Pick cell with fewest candidates from robatron/sudoku.js or first unsolved cell
      const sanitizedString = board
        .map((val, idx) =>
          val !== 0 && val === solution[idx] ? String(val) : BLANK_CHAR
        )
        .join('')
      const candidateGrid = get_candidates(sanitizedString)

      let bestIdx: number | null = null
      let bestCount = 10

      for (let i = 0; i < 81; i++) {
        if (board[i] === solution[i]) continue
        const r = Math.floor(i / 9)
        const c = i % 9
        const count = candidateGrid ? candidateGrid[r][c].length : 9
        if (count < bestCount) {
          bestCount = count
          bestIdx = i
        }
      }
      target = bestIdx
    }

    if (target === null) return

    const correctDigit = solution[target]
    setHistory((prev) => [
      ...prev.slice(-60),
      { board: [...board], notes: [...notes] },
    ])

    const nextBoard = [...board]
    nextBoard[target] = correctDigit

    const nextNotes = [...notes]
    nextNotes[target] = 0
    for (const peer of PEERS_TABLE[target]) {
      nextNotes[peer] = clearNoteBit(nextNotes[peer], correctDigit)
    }

    setBoard(nextBoard)
    setNotes(nextNotes)
    setSelectedIndex(target)
    setLastHintIndex(target)
    setHintsUsed((h) => h + 1)

    if (checkVictory(nextBoard)) {
      setIsWon(true)
      playTileSound('win', soundEnabled)
    } else {
      playTileSound('hint', soundEnabled)
    }
  }, [
    isReady,
    isPaused,
    isWon,
    selectedIndex,
    initialBoard,
    board,
    solution,
    notes,
    checkVictory,
    soundEnabled,
  ])

  const triggerCameraPreset = useCallback((preset: CameraPreset) => {
    setCameraPreset(preset)
    setCameraResetTick((t) => t + 1)
  }, [])

  // Global keyboard controls for both 3D & 2D modes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (!isReady || isPaused) return

      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        inputDigit(Number(e.key))
        return
      }

      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault()
        eraseCell()
        return
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setIsNotesMode((prev) => !prev)
        return
      }

      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
        e.preventDefault()
        undo()
        return
      }

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault()
        useHint()
        return
      }

      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault()
        setSelectedIndex((prev) => {
          const cur = prev ?? 40
          const row = Math.floor(cur / 9)
          const col = cur % 9
          if (e.key === 'ArrowUp') return ((row + 8) % 9) * 9 + col
          if (e.key === 'ArrowDown') return ((row + 1) % 9) * 9 + col
          if (e.key === 'ArrowLeft') return row * 9 + ((col + 8) % 9)
          return row * 9 + ((col + 1) % 9)
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isReady, isPaused, inputDigit, eraseCell, undo, useHint])

  return {
    isReady,
    mode,
    setMode,
    cameraPreset,
    cameraResetTick,
    triggerCameraPreset,
    reliefMode,
    setReliefMode,
    soundEnabled,
    setSoundEnabled,
    difficulty,
    initialBoard,
    board,
    solution,
    notes,
    historyCount: history.length,
    selectedIndex,
    lastHintIndex,
    isNotesMode,
    setIsNotesMode,
    lockedDigit,
    setLockedDigit,
    mistakes,
    hintsUsed,
    elapsedSeconds,
    isPaused,
    setIsPaused,
    isWon,
    conflicts,
    peerSet,
    activeHighlightDigit,
    remainingDigits,
    filledCorrectCount,
    startNewGame,
    resetCurrentBoard,
    selectCell,
    inputDigit,
    eraseCell,
    undo,
    useHint,
    fillSmartCandidates,
  }
}

export type SudokuGameController = ReturnType<typeof useSudokuGame>
