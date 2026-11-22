'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createSudokuGame,
  getCandidateMasks,
  symbolToValue,
  type BoardSize,
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

export function countBits(mask: number): number {
  let count = 0
  let v = mask
  while (v !== 0) {
    v &= v - 1
    count++
  }
  return count
}

export function getPeerIndices(index: number, size: BoardSize = 9): number[] {
  const boxSize = size === 16 ? 4 : 3
  const row = Math.floor(index / size)
  const col = index % size
  const boxRow = Math.floor(row / boxSize) * boxSize
  const boxCol = Math.floor(col / boxSize) * boxSize
  const peers = new Set<number>()

  for (let i = 0; i < size; i++) {
    const rIdx = row * size + i
    const cIdx = i * size + col
    if (rIdx !== index) peers.add(rIdx)
    if (cIdx !== index) peers.add(cIdx)
  }

  for (let r = boxRow; r < boxRow + boxSize; r++) {
    for (let c = boxCol; c < boxCol + boxSize; c++) {
      const bIdx = r * size + c
      if (bIdx !== index) peers.add(bIdx)
    }
  }

  return Array.from(peers)
}

const PEERS_TABLE_9: number[][] = Array.from({ length: 81 }, (_, i) =>
  getPeerIndices(i, 9)
)

const PEERS_TABLE_16: number[][] = Array.from({ length: 256 }, (_, i) =>
  getPeerIndices(i, 16)
)

function getPeersTable(size: BoardSize): number[][] {
  return size === 16 ? PEERS_TABLE_16 : PEERS_TABLE_9
}

function computeConflicts(
  board: number[],
  solution: number[],
  size: BoardSize
): Set<number> {
  const conflicts = new Set<number>()
  const peersTable = getPeersTable(size)
  const total = size * size

  for (let i = 0; i < total; i++) {
    const val = board[i]
    if (val === 0) continue

    if (solution[i] !== 0 && val !== solution[i]) {
      conflicts.add(i)
    }

    for (const peer of peersTable[i]) {
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

const INITIAL_PLACEHOLDER = Array.from({ length: 81 }, () => 0)

export function useSudokuGame() {
  const [isReady, setIsReady] = useState(false)
  const [mode, setMode] = useState<ViewMode>('3d')
  const [boardSize, setBoardSize] = useState<BoardSize>(9)
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric')
  const [cameraResetTick, setCameraResetTick] = useState(0)
  const [reliefMode, setReliefMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const [difficulty, setDifficulty] = useState<DifficultyKey>('medium')
  const [givensCount, setGivensCount] = useState(53)
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

  const boxSize: 3 | 4 = boardSize === 16 ? 4 : 3
  const totalCells = boardSize * boardSize

  const startNewGame = useCallback(
    (nextDifficulty: DifficultyKey, nextSize?: BoardSize) => {
      const targetSize = nextSize ?? boardSize
      const generated = createSudokuGame(nextDifficulty, targetSize)
      setBoardSize(targetSize)
      setDifficulty(nextDifficulty)
      setGivensCount(generated.givensCount)
      setInitialBoard(generated.initialBoard)
      setBoard([...generated.initialBoard])
      setSolution(generated.solutionBoard)
      setNotes(Array.from({ length: targetSize * targetSize }, () => 0))
      setHistory([])
      const firstEmpty = generated.initialBoard.findIndex((v) => v === 0)
      setSelectedIndex(
        firstEmpty >= 0 ? firstEmpty : Math.floor((targetSize * targetSize) / 2)
      )
      setLastHintIndex(null)
      setIsNotesMode(false)
      setLockedDigit(null)
      setMistakes(0)
      setHintsUsed(0)
      setElapsedSeconds(0)
      setIsPaused(false)
      setIsWon(false)
      setIsReady(true)
    },
    [boardSize]
  )

  const changeBoardSize = useCallback(
    (nextSize: BoardSize) => {
      if (nextSize === boardSize) return
      startNewGame(difficulty, nextSize)
    },
    [boardSize, difficulty, startNewGame]
  )

  useEffect(() => {
    startNewGame('medium', 9)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Timer tick
  useEffect(() => {
    if (!isReady || isPaused || isWon) return
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isReady, isPaused, isWon])

  const conflicts = useMemo(
    () => computeConflicts(board, solution, boardSize),
    [board, solution, boardSize]
  )

  const peerSet = useMemo(() => {
    if (selectedIndex === null) return new Set<number>()
    const peersTable = getPeersTable(boardSize)
    return new Set<number>(peersTable[selectedIndex] ?? [])
  }, [selectedIndex, boardSize])

  const activeHighlightDigit = useMemo(() => {
    if (lockedDigit !== null) return lockedDigit
    if (selectedIndex !== null && board[selectedIndex] !== 0) {
      return board[selectedIndex]
    }
    return null
  }, [lockedDigit, selectedIndex, board])

  const remainingDigits = useMemo(() => {
    const counts: Record<number, number> = {}
    for (let d = 1; d <= boardSize; d++) {
      counts[d] = boardSize
    }
    for (let i = 0; i < totalCells; i++) {
      const val = board[i]
      if (val >= 1 && val <= boardSize && val === solution[i]) {
        counts[val] = Math.max(0, counts[val] - 1)
      }
    }
    return counts
  }, [board, solution, boardSize, totalCells])

  const filledCorrectCount = useMemo(() => {
    let count = 0
    for (let i = 0; i < totalCells; i++) {
      if (board[i] !== 0 && board[i] === solution[i]) count++
    }
    return count
  }, [board, solution, totalCells])

  const checkVictory = useCallback(
    (nextBoard: number[]) => {
      for (let i = 0; i < totalCells; i++) {
        if (nextBoard[i] === 0 || nextBoard[i] !== solution[i]) {
          return false
        }
      }
      return true
    },
    [solution, totalCells]
  )

  const applyDigitAt = useCallback(
    (targetIndex: number, digit: number, notesModeOverride?: boolean) => {
      if (!isReady || isPaused || isWon) return
      if (digit < 1 || digit > boardSize) return
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

      // Toggle off if pressing same symbol already placed
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
        const peersTable = getPeersTable(boardSize)
        for (const peer of peersTable[targetIndex]) {
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
      boardSize,
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
    [
      isReady,
      isPaused,
      lockedDigit,
      initialBoard,
      isWon,
      applyDigitAt,
      soundEnabled,
    ]
  )

  const inputDigit = useCallback(
    (digit: number) => {
      if (!isReady || isPaused || isWon) return
      if (digit < 1 || digit > boardSize) return
      if (lockedDigit !== null) {
        setLockedDigit((prev) => (prev === digit ? null : digit))
        playTileSound('select', soundEnabled)
        return
      }
      if (selectedIndex === null) return
      applyDigitAt(selectedIndex, digit)
    },
    [
      isReady,
      isPaused,
      isWon,
      boardSize,
      lockedDigit,
      selectedIndex,
      applyDigitAt,
      soundEnabled,
    ]
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
  }, [
    isReady,
    isPaused,
    isWon,
    selectedIndex,
    initialBoard,
    board,
    notes,
    soundEnabled,
  ])

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
    setNotes(Array.from({ length: totalCells }, () => 0))
    setHistory([])
    setMistakes(0)
    setHintsUsed(0)
    setElapsedSeconds(0)
    setIsPaused(false)
    setIsWon(false)
    setLastHintIndex(null)
    playTileSound('select', soundEnabled)
  }, [isReady, initialBoard, totalCells, soundEnabled])

  // Populates valid pencil marks using Norvig constraint propagation for 9x9 & 16x16
  const fillSmartCandidates = useCallback(() => {
    if (!isReady || isPaused || isWon) return

    const candidateMasks = getCandidateMasks(board, solution, boardSize)
    if (!candidateMasks) return

    setHistory((prev) => [
      ...prev.slice(-60),
      { board: [...board], notes: [...notes] },
    ])

    setNotes(candidateMasks)
    playTileSound('hint', soundEnabled)
  }, [isReady, isPaused, isWon, board, solution, boardSize, notes, soundEnabled])

  const useHint = useCallback(() => {
    if (!isReady || isPaused || isWon) return

    let target = selectedIndex
    if (
      target === null ||
      initialBoard[target] !== 0 ||
      board[target] === solution[target]
    ) {
      const candidateMasks = getCandidateMasks(board, solution, boardSize)

      let bestIdx: number | null = null
      let bestCount = boardSize + 1

      for (let i = 0; i < totalCells; i++) {
        if (board[i] === solution[i]) continue
        const count = candidateMasks
          ? countBits(candidateMasks[i])
          : boardSize
        if (count > 0 && count < bestCount) {
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
    const peersTable = getPeersTable(boardSize)
    for (const peer of peersTable[target]) {
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
    boardSize,
    totalCells,
    notes,
    checkVictory,
    soundEnabled,
  ])

  const triggerCameraPreset = useCallback((preset: CameraPreset) => {
    setCameraPreset(preset)
    setCameraResetTick((t) => t + 1)
  }, [])

  // Global keyboard controls for both 9x9 (1-9) & 16x16 (1-9, A-G) in 3D & 2D
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

      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const symVal = symbolToValue(e.key, boardSize)
        if (symVal > 0) {
          e.preventDefault()
          inputDigit(symVal)
          return
        }
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

      if (
        (e.key === 'z' || e.key === 'Z') &&
        (e.metaKey || e.ctrlKey || !e.shiftKey)
      ) {
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
          const cur = prev ?? Math.floor(totalCells / 2)
          const row = Math.floor(cur / boardSize)
          const col = cur % boardSize
          if (e.key === 'ArrowUp')
            return ((row + boardSize - 1) % boardSize) * boardSize + col
          if (e.key === 'ArrowDown')
            return ((row + 1) % boardSize) * boardSize + col
          if (e.key === 'ArrowLeft')
            return row * boardSize + ((col + boardSize - 1) % boardSize)
          return row * boardSize + ((col + 1) % boardSize)
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    isReady,
    isPaused,
    boardSize,
    totalCells,
    inputDigit,
    eraseCell,
    undo,
    useHint,
  ])

  return {
    isReady,
    mode,
    setMode,
    boardSize,
    boxSize,
    totalCells,
    changeBoardSize,
    cameraPreset,
    cameraResetTick,
    triggerCameraPreset,
    reliefMode,
    setReliefMode,
    soundEnabled,
    setSoundEnabled,
    difficulty,
    givensCount,
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
