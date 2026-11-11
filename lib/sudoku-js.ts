/**
 * Faithful TypeScript adaptation of robatron/sudoku.js (MIT License)
 * Source: https://github.com/robatron/sudoku.js
 * Ideas from Peter Norvig's "Solving Every Sudoku Puzzle" and Rob McGuire-Dale.
 */

export type DifficultyKey =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'very-hard'
  | 'insane'
  | 'inhuman'

export interface DifficultyMeta {
  key: DifficultyKey
  label: string
  shortLabel: string
  givens: number
  description: string
}

export const DIFFICULTY_LEVELS: DifficultyMeta[] = [
  {
    key: 'easy',
    label: 'Fácil',
    shortLabel: 'Fácil',
    givens: 62,
    description: '62 pistas iniciales · Ideal para calentar',
  },
  {
    key: 'medium',
    label: 'Medio',
    shortLabel: 'Medio',
    givens: 53,
    description: '53 pistas iniciales · Equilibrio clásico',
  },
  {
    key: 'hard',
    label: 'Difícil',
    shortLabel: 'Difícil',
    givens: 44,
    description: '44 pistas iniciales · Requiere candidatos',
  },
  {
    key: 'very-hard',
    label: 'Muy Difícil',
    shortLabel: 'M. Difícil',
    givens: 35,
    description: '35 pistas iniciales · Deducción avanzada',
  },
  {
    key: 'insane',
    label: 'Experto',
    shortLabel: 'Experto',
    givens: 26,
    description: '26 pistas iniciales · Nivel maestro (Insane)',
  },
  {
    key: 'inhuman',
    label: 'Inhumano',
    shortLabel: 'Inhumano',
    givens: 17,
    description: '17 pistas · Mínimo matemático posible',
  },
]

export const DIGITS = '123456789'
const ROWS = 'ABCDEFGHI'
const COLS = DIGITS
const MIN_GIVENS = 17
const NR_SQUARES = 81

export const DIFFICULTY_GIVENS: Record<DifficultyKey, number> = {
  easy: 62,
  medium: 53,
  hard: 44,
  'very-hard': 35,
  insane: 26,
  inhuman: 17,
}

export const BLANK_CHAR = '.'
export const BLANK_BOARD = '.'.repeat(NR_SQUARES)

type CandidatesMap = Record<string, string>

function cross(a: string, b: string): string[] {
  const result: string[] = []
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      result.push(a[i] + b[j])
    }
  }
  return result
}

function getAllUnits(rows: string, cols: string): string[][] {
  const units: string[][] = []
  for (let r = 0; r < rows.length; r++) {
    units.push(cross(rows[r], cols))
  }
  for (let c = 0; c < cols.length; c++) {
    units.push(cross(rows, cols[c]))
  }
  const rowSquares = ['ABC', 'DEF', 'GHI']
  const colSquares = ['123', '456', '789']
  for (const rs of rowSquares) {
    for (const cs of colSquares) {
      units.push(cross(rs, cs))
    }
  }
  return units
}

const SQUARES: string[] = cross(ROWS, COLS)
const UNITS: string[][] = getAllUnits(ROWS, COLS)

const SQUARE_UNITS_MAP: Record<string, string[][]> = (() => {
  const map: Record<string, string[][]> = {}
  for (const s of SQUARES) {
    map[s] = UNITS.filter((u) => u.includes(s))
  }
  return map
})()

const SQUARE_PEERS_MAP: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {}
  for (const s of SQUARES) {
    const peerSet = new Set<string>()
    for (const unit of SQUARE_UNITS_MAP[s]) {
      for (const peer of unit) {
        if (peer !== s) peerSet.add(peer)
      }
    }
    map[s] = Array.from(peerSet)
  }
  return map
})()

function randRange(max: number, min = 0): number {
  return Math.floor(Math.random() * (max - min)) + min
}

function shuffle<T>(seq: readonly T[]): T[] {
  const copy = [...seq]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randRange(i + 1)
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

function stripDups<T>(seq: readonly T[]): T[] {
  return Array.from(new Set(seq))
}

function forceRange(nr: number, max: number, min = 0): number {
  if (nr < min) return min
  if (nr >= max) return max - 1
  return nr
}

export function validate_board(board: string): true | string {
  if (!board) return 'Empty board'
  if (board.length !== NR_SQUARES) {
    return `Invalid board size. Board must be exactly ${NR_SQUARES} squares.`
  }
  for (let i = 0; i < board.length; i++) {
    const ch = board[i]
    if (ch !== BLANK_CHAR && !DIGITS.includes(ch)) {
      return `Invalid board character encountered at index ${i}: ${ch}`
    }
  }
  return true
}

function getSquareValsMap(board: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (let i = 0; i < SQUARES.length; i++) {
    map[SQUARES[i]] = board[i]
  }
  return map
}

function eliminate(
  candidates: CandidatesMap,
  square: string,
  val: string
): CandidatesMap | false {
  if (!candidates[square].includes(val)) {
    return candidates
  }

  candidates[square] = candidates[square].replace(val, '')
  const nrCandidates = candidates[square].length

  if (nrCandidates === 0) {
    return false
  }

  if (nrCandidates === 1) {
    const targetVal = candidates[square]
    for (const peer of SQUARE_PEERS_MAP[square]) {
      if (!eliminate(candidates, peer, targetVal)) {
        return false
      }
    }
  }

  for (const unit of SQUARE_UNITS_MAP[square]) {
    const valPlaces: string[] = []
    for (const unitSquare of unit) {
      if (candidates[unitSquare].includes(val)) {
        valPlaces.push(unitSquare)
      }
    }
    if (valPlaces.length === 0) {
      return false
    } else if (valPlaces.length === 1) {
      if (!assign(candidates, valPlaces[0], val)) {
        return false
      }
    }
  }

  return candidates
}

function assign(
  candidates: CandidatesMap,
  square: string,
  val: string
): CandidatesMap | false {
  const otherVals = candidates[square].replace(val, '')
  for (let i = 0; i < otherVals.length; i++) {
    if (!eliminate(candidates, square, otherVals[i])) {
      return false
    }
  }
  return candidates
}

function cloneCandidates(candidates: CandidatesMap): CandidatesMap {
  const copy: CandidatesMap = {}
  for (let i = 0; i < SQUARES.length; i++) {
    const sq = SQUARES[i]
    copy[sq] = candidates[sq]
  }
  return copy
}

export function _get_candidates_map(board: string): CandidatesMap | false {
  const report = validate_board(board)
  if (report !== true) {
    throw new Error(report)
  }

  const candidateMap: CandidatesMap = {}
  const squaresValuesMap = getSquareValsMap(board)

  for (const sq of SQUARES) {
    candidateMap[sq] = DIGITS
  }

  for (const sq of SQUARES) {
    const val = squaresValuesMap[sq]
    if (DIGITS.includes(val)) {
      if (!assign(candidateMap, sq, val)) {
        return false
      }
    }
  }

  return candidateMap
}

function search(
  candidates: CandidatesMap | false,
  reverse = false,
  randomize = false
): CandidatesMap | false {
  if (!candidates) return false

  let maxNrCandidates = 0
  let minNrCandidates = 10
  let minCandidatesSquare: string | null = null

  for (const sq of SQUARES) {
    const len = candidates[sq].length
    if (len > maxNrCandidates) {
      maxNrCandidates = len
    }
    if (len > 1 && len < minNrCandidates) {
      minNrCandidates = len
      minCandidatesSquare = sq
    }
  }

  if (maxNrCandidates === 1) {
    return candidates
  }

  if (!minCandidatesSquare) return false

  const rawOptions = candidates[minCandidatesSquare]
  const orderedOptions = randomize
    ? shuffle(rawOptions.split(''))
    : reverse
      ? rawOptions.split('').reverse()
      : rawOptions.split('')

  for (const val of orderedOptions) {
    const copy = cloneCandidates(candidates)
    const next = search(assign(copy, minCandidatesSquare, val), reverse, randomize)
    if (next) return next
  }

  return false
}

export function solve(board: string, reverse = false): string | false {
  const report = validate_board(board)
  if (report !== true) {
    throw new Error(report)
  }

  const candidates = _get_candidates_map(board)
  const result = search(candidates, reverse, false)

  if (result) {
    let solution = ''
    for (const sq of SQUARES) {
      solution += result[sq]
    }
    return solution
  }
  return false
}

export function get_candidates(board: string): string[][] | false {
  const report = validate_board(board)
  if (report !== true) {
    throw new Error(report)
  }

  const candidatesMap = _get_candidates_map(board)
  if (!candidatesMap) return false

  const rows: string[][] = []
  let curRow: string[] = []
  for (let i = 0; i < SQUARES.length; i++) {
    curRow.push(candidatesMap[SQUARES[i]])
    if (i % 9 === 8) {
      rows.push(curRow)
      curRow = []
    }
  }
  return rows
}

export function board_string_to_grid(boardString: string): string[][] {
  const rows: string[][] = []
  let curRow: string[] = []
  for (let i = 0; i < boardString.length; i++) {
    curRow.push(boardString[i])
    if (i % 9 === 8) {
      rows.push(curRow)
      curRow = []
    }
  }
  return rows
}

export function board_grid_to_string(boardGrid: string[][]): string {
  let str = ''
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      str += boardGrid[r][c]
    }
  }
  return str
}

/**
 * Generates a Sudoku puzzle using robatron/sudoku.js's algorithm, with an
 * iterative time-bounded fallback digger for extreme levels (26 / 17 givens)
 * so generation never overflows the call stack or blocks mobile UI.
 */
export function generate(
  difficulty: DifficultyKey | number = 'easy',
  unique = true
): string {
  const targetGivens =
    typeof difficulty === 'string'
      ? DIFFICULTY_GIVENS[difficulty] ?? DIFFICULTY_GIVENS.easy
      : forceRange(difficulty, NR_SQUARES + 1, MIN_GIVENS)

  const startTime = Date.now()
  const maxDirectMs = 90

  while (Date.now() - startTime < maxDirectMs) {
    const candidates = _get_candidates_map(BLANK_BOARD)
    if (!candidates) continue

    const shuffledSquares = shuffle(SQUARES)
    for (const square of shuffledSquares) {
      const squareCandidates = candidates[square]
      if (!squareCandidates || squareCandidates.length === 0) break

      const randCandidate =
        squareCandidates[randRange(squareCandidates.length)]
      if (!assign(candidates, square, randCandidate)) {
        break
      }

      const singleCandidates: string[] = []
      for (const sq of SQUARES) {
        if (candidates[sq].length === 1) {
          singleCandidates.push(candidates[sq])
        }
      }

      if (
        singleCandidates.length >= targetGivens &&
        stripDups(singleCandidates).length >= 8
      ) {
        const boardChars: string[] = []
        const givensIdxs: number[] = []

        for (let i = 0; i < SQUARES.length; i++) {
          const sq = SQUARES[i]
          if (candidates[sq].length === 1) {
            boardChars.push(candidates[sq])
            givensIdxs.push(i)
          } else {
            boardChars.push(BLANK_CHAR)
          }
        }

        if (givensIdxs.length > targetGivens) {
          const shuffledIdxs = shuffle(givensIdxs)
          const toRemove = givensIdxs.length - targetGivens
          for (let i = 0; i < toRemove; i++) {
            boardChars[shuffledIdxs[i]] = BLANK_CHAR
          }
        }

        const candidateBoard = boardChars.join('')
        const forwardSolution = solve(candidateBoard, false)
        if (forwardSolution) {
          if (!unique) return candidateBoard
          const reverseSolution = solve(candidateBoard, true)
          if (reverseSolution === forwardSolution) {
            return candidateBoard
          }
        }
      }
    }
  }

  // Deterministic unique clue-digging fallback for ultra-low-clue levels (insane/inhuman)
  const fullCandidates = _get_candidates_map(BLANK_BOARD)
  const solvedMap = search(fullCandidates, false, true)
  if (!solvedMap) return generate('hard', unique)

  const fullBoardChars = SQUARES.map((sq) => solvedMap[sq])
  const fullSolution = fullBoardChars.join('')

  let bestChars = [...fullBoardChars]
  let bestCount = NR_SQUARES

  // Try up to 3 randomized digging passes to get as close to targetGivens as possible
  for (let pass = 0; pass < 3; pass++) {
    const chars = [...fullBoardChars]
    let currentGivens = NR_SQUARES
    const indices = shuffle(Array.from({ length: NR_SQUARES }, (_, i) => i))

    for (const idx of indices) {
      if (currentGivens <= targetGivens) break
      const backup = chars[idx]
      chars[idx] = BLANK_CHAR

      const testBoard = chars.join('')
      if (!unique) {
        currentGivens--
      } else {
        const revSol = solve(testBoard, true)
        const fwdSol = solve(testBoard, false)
        if (fwdSol === fullSolution && revSol === fullSolution) {
          currentGivens--
        } else {
          chars[idx] = backup
        }
      }
    }

    if (currentGivens < bestCount) {
      bestCount = currentGivens
      bestChars = chars
    }
    if (bestCount <= targetGivens) break
  }

  return bestChars.join('')
}

export interface GeneratedSudokuGame {
  puzzleString: string
  solutionString: string
  initialBoard: number[]
  solutionBoard: number[]
  difficulty: DifficultyKey
  givensCount: number
}

export function createSudokuGame(
  difficulty: DifficultyKey = 'medium'
): GeneratedSudokuGame {
  const puzzleString = generate(difficulty, true)
  const solved = solve(puzzleString, false)
  if (!solved) {
    throw new Error('Failed to solve generated Sudoku board')
  }

  const initialBoard = puzzleString
    .split('')
    .map((ch) => (ch === BLANK_CHAR ? 0 : Number(ch)))
  const solutionBoard = solved.split('').map((ch) => Number(ch))
  const givensCount = initialBoard.filter((n) => n !== 0).length

  return {
    puzzleString,
    solutionString: solved,
    initialBoard,
    solutionBoard,
    difficulty,
    givensCount,
  }
}

export const sudoku = {
  DIGITS,
  BLANK_CHAR,
  BLANK_BOARD,
  DIFFICULTY: DIFFICULTY_GIVENS,
  generate,
  solve,
  get_candidates,
  board_string_to_grid,
  board_grid_to_string,
  validate_board,
}
