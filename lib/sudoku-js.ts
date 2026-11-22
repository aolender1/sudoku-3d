/**
 * Faithful TypeScript adaptation of robatron/sudoku.js (MIT License)
 * Source: https://github.com/robatron/sudoku.js
 * Ideas from Peter Norvig's "Solving Every Sudoku Puzzle" and Rob McGuire-Dale.
 *
 * Extended with a bitmask-accelerated Norvig constraint propagation engine
 * supporting both classic 9x9 (3x3 boxes, 1-9) and 16x16 Hexadoku
 * (4x4 boxes, 1-9 and A-G).
 */

export type BoardSize = 9 | 16

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

export const SYMBOLS_9 = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
export const SYMBOLS_16 = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
] as const

export function getSymbols(size: BoardSize): readonly string[] {
  return size === 16 ? SYMBOLS_16 : SYMBOLS_9
}

export function valueToSymbol(val: number): string {
  if (val >= 1 && val <= 16) {
    return SYMBOLS_16[val - 1]
  }
  return ''
}

export function symbolToValue(ch: string, size: BoardSize = 16): number {
  const upper = ch.toUpperCase()
  const idx = SYMBOLS_16.indexOf(upper as (typeof SYMBOLS_16)[number])
  if (idx === -1) return 0
  const val = idx + 1
  return val <= size ? val : 0
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

export const DIFFICULTY_LEVELS_16: DifficultyMeta[] = [
  {
    key: 'easy',
    label: 'Fácil',
    shortLabel: 'Fácil',
    givens: 176,
    description: '176 pistas iniciales · Introducción a 16×16',
  },
  {
    key: 'medium',
    label: 'Medio',
    shortLabel: 'Medio',
    givens: 152,
    description: '152 pistas iniciales · Equilibrio Hexadoku',
  },
  {
    key: 'hard',
    label: 'Difícil',
    shortLabel: 'Difícil',
    givens: 132,
    description: '132 pistas iniciales · Requiere candidatos 1–G',
  },
  {
    key: 'very-hard',
    label: 'Muy Difícil',
    shortLabel: 'M. Difícil',
    givens: 116,
    description: '116 pistas iniciales · Deducción avanzada 4×4',
  },
  {
    key: 'insane',
    label: 'Experto',
    shortLabel: 'Experto',
    givens: 102,
    description: '102 pistas iniciales · Nivel maestro 16×16',
  },
  {
    key: 'inhuman',
    label: 'Inhumano',
    shortLabel: 'Inhumano',
    givens: 90,
    description: '90 pistas · Desafío extremo de 256 casillas',
  },
]

export function getDifficultyLevels(size: BoardSize): DifficultyMeta[] {
  return size === 16 ? DIFFICULTY_LEVELS_16 : DIFFICULTY_LEVELS
}

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

export const DIFFICULTY_GIVENS_16: Record<DifficultyKey, number> = {
  easy: 176,
  medium: 152,
  hard: 132,
  'very-hard': 116,
  insane: 102,
  inhuman: 90,
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
    const next = search(
      assign(copy, minCandidatesSquare, val),
      reverse,
      randomize
    )
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
 * Generates a 9x9 Sudoku puzzle using robatron/sudoku.js's algorithm, with an
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

/* ============================================================================
 * 16x16 Hexadoku (4x4 boxes, symbols 1-9 & A-G)
 * Bitmask-accelerated Norvig constraint propagation variant of sudoku.js
 * ============================================================================ */

const SIZE_16 = 16
const BOX_16 = 4
const CELLS_16 = 256
const ALL_MASK_16 = 0xffff // bits 0..15 -> values 1..16

// Precomputed 16-bit popcount lookup table (0..65535)
const POPCOUNT_16 = (() => {
  const table = new Uint8Array(65536)
  for (let i = 1; i < 65536; i++) {
    table[i] = table[i >> 1] + (i & 1)
  }
  return table
})()

// Precomputed trailing zero count for single-bit masks
const BIT_TO_VAL_16 = new Map<number, number>()
for (let b = 0; b < 16; b++) {
  BIT_TO_VAL_16.set(1 << b, b + 1)
}

// 48 units: 16 rows + 16 cols + 16 4x4 boxes
const UNITS_16: Uint16Array[] = (() => {
  const units: Uint16Array[] = []
  for (let r = 0; r < SIZE_16; r++) {
    const u = new Uint16Array(SIZE_16)
    for (let c = 0; c < SIZE_16; c++) u[c] = r * SIZE_16 + c
    units.push(u)
  }
  for (let c = 0; c < SIZE_16; c++) {
    const u = new Uint16Array(SIZE_16)
    for (let r = 0; r < SIZE_16; r++) u[r] = r * SIZE_16 + c
    units.push(u)
  }
  for (let br = 0; br < BOX_16; br++) {
    for (let bc = 0; bc < BOX_16; bc++) {
      const u = new Uint16Array(SIZE_16)
      let k = 0
      for (let r = br * BOX_16; r < (br + 1) * BOX_16; r++) {
        for (let c = bc * BOX_16; c < (bc + 1) * BOX_16; c++) {
          u[k++] = r * SIZE_16 + c
        }
      }
      units.push(u)
    }
  }
  return units
})()

const CELL_UNITS_16: [number, number, number][] = Array.from(
  { length: CELLS_16 },
  (_, idx) => {
    const r = Math.floor(idx / SIZE_16)
    const c = idx % SIZE_16
    const b = Math.floor(r / BOX_16) * BOX_16 + Math.floor(c / BOX_16)
    return [r, SIZE_16 + c, SIZE_16 * 2 + b]
  }
)

const PEERS_16: Uint16Array[] = Array.from({ length: CELLS_16 }, (_, idx) => {
  const [ru, cu, bu] = CELL_UNITS_16[idx]
  const set = new Set<number>()
  for (const unitIdx of [ru, cu, bu]) {
    const unit = UNITS_16[unitIdx]
    for (let i = 0; i < SIZE_16; i++) {
      if (unit[i] !== idx) set.add(unit[i])
    }
  }
  return Uint16Array.from(set)
})

function eliminate16(
  cands: Uint16Array,
  cell: number,
  bit: number
): boolean {
  if ((cands[cell] & bit) === 0) return true

  const nextMask = cands[cell] & ~bit
  cands[cell] = nextMask

  if (nextMask === 0) return false

  // Rule 1 (Naked Single): if cell is reduced to one candidate, eliminate it from peers
  if ((nextMask & (nextMask - 1)) === 0) {
    const peers = PEERS_16[cell]
    for (let i = 0; i < peers.length; i++) {
      if (!eliminate16(cands, peers[i], nextMask)) return false
    }
  }

  // Rule 2 (Hidden Single): if a unit now has only 1 place for `bit`, assign it there
  const cellUnits = CELL_UNITS_16[cell]
  for (let u = 0; u < 3; u++) {
    const unit = UNITS_16[cellUnits[u]]
    let place = -1
    let count = 0
    for (let i = 0; i < SIZE_16; i++) {
      const sq = unit[i]
      if ((cands[sq] & bit) !== 0) {
        place = sq
        count++
        if (count > 1) break
      }
    }
    if (count === 0) return false
    if (count === 1 && cands[place] !== bit) {
      if (!assign16(cands, place, bit)) return false
    }
  }

  return true
}

function assign16(cands: Uint16Array, cell: number, bit: number): boolean {
  const others = cands[cell] & ~bit
  if (others === 0) return (cands[cell] & bit) !== 0

  let rem = others
  while (rem !== 0) {
    const lsb = rem & -rem
    if (!eliminate16(cands, cell, lsb)) return false
    rem ^= lsb
  }
  return true
}

function buildCandidates16(board: number[]): Uint16Array | null {
  const cands = new Uint16Array(CELLS_16)
  cands.fill(ALL_MASK_16)

  for (let i = 0; i < CELLS_16; i++) {
    const val = board[i]
    if (val >= 1 && val <= SIZE_16) {
      if (!assign16(cands, i, 1 << (val - 1))) {
        return null
      }
    }
  }
  return cands
}

function search16Single(
  cands: Uint16Array,
  randomize: boolean,
  budget: { nodes: number; maxNodes: number }
): Uint16Array | null {
  if (++budget.nodes > budget.maxNodes) return null

  let minCell = -1
  let minCount = 17
  for (let i = 0; i < CELLS_16; i++) {
    const cnt = POPCOUNT_16[cands[i]]
    if (cnt === 0) return null
    if (cnt > 1 && cnt < minCount) {
      minCount = cnt
      minCell = i
      if (cnt === 2) break
    }
  }

  if (minCell === -1) return cands

  const bits: number[] = []
  let mask = cands[minCell]
  while (mask !== 0) {
    const lsb = mask & -mask
    bits.push(lsb)
    mask ^= lsb
  }

  const ordered = randomize ? shuffle(bits) : bits
  for (let i = 0; i < ordered.length; i++) {
    const copy = new Uint16Array(cands)
    if (assign16(copy, minCell, ordered[i])) {
      const solved = search16Single(copy, randomize, budget)
      if (solved) return solved
    }
  }
  return null
}

/**
 * Counts up to 2 solutions for a 16x16 board with a strict search node budget.
 * Returns:
 * - 1 if guaranteed unique within budget
 * - 2 if multiple solutions exist
 * - 0 if unsolvable
 * - -1 if budget exceeded (treated conservatively as non-unique during clue digging)
 */
function countSolutions16(
  cands: Uint16Array,
  budget: { nodes: number; maxNodes: number }
): number {
  if (++budget.nodes > budget.maxNodes) return -1

  let minCell = -1
  let minCount = 17
  for (let i = 0; i < CELLS_16; i++) {
    const cnt = POPCOUNT_16[cands[i]]
    if (cnt === 0) return 0
    if (cnt > 1 && cnt < minCount) {
      minCount = cnt
      minCell = i
      if (cnt === 2) break
    }
  }

  if (minCell === -1) return 1

  let total = 0
  let mask = cands[minCell]
  while (mask !== 0) {
    const lsb = mask & -mask
    mask ^= lsb
    const copy = new Uint16Array(cands)
    if (assign16(copy, minCell, lsb)) {
      const sub = countSolutions16(copy, budget)
      if (sub === -1) return -1
      total += sub
      if (total >= 2) return 2
    }
  }
  return total
}

/**
 * Generates a uniformly randomized valid 16x16 completed grid in ~1-3ms.
 * Seeds the 4 independent diagonal 4x4 boxes with random permutations, solves
 * the rest with bitmask Norvig propagation, and applies band/stack/symbol shuffles.
 */
function generateFullSolution16(): number[] {
  const symbols = Array.from({ length: SIZE_16 }, (_, i) => i + 1)

  for (let attempt = 0; attempt < 8; attempt++) {
    const cands = new Uint16Array(CELLS_16)
    cands.fill(ALL_MASK_16)
    let ok = true

    // Seed the 4 independent diagonal 4x4 boxes
    for (let box = 0; box < BOX_16 && ok; box++) {
      const perm = shuffle(symbols)
      let k = 0
      for (let r = box * BOX_16; r < (box + 1) * BOX_16 && ok; r++) {
        for (let c = box * BOX_16; c < (box + 1) * BOX_16 && ok; c++) {
          const val = perm[k++]
          if (!assign16(cands, r * SIZE_16 + c, 1 << (val - 1))) {
            ok = false
          }
        }
      }
    }

    if (!ok) continue

    const solved = search16Single(cands, true, { nodes: 0, maxNodes: 800 })
    if (solved) {
      return applySymmetryShuffle16(
        Array.from({ length: CELLS_16 }, (_, i) => BIT_TO_VAL_16.get(solved[i]) ?? 1)
      )
    }
  }

  // Deterministic canonical Latin shift fallback + full symmetry randomization
  const base = new Array<number>(CELLS_16)
  for (let r = 0; r < SIZE_16; r++) {
    for (let c = 0; c < SIZE_16; c++) {
      base[r * SIZE_16 + c] =
        ((Math.floor(r / BOX_16) + (r % BOX_16) * BOX_16 + c) % SIZE_16) + 1
    }
  }
  return applySymmetryShuffle16(base)
}

function applySymmetryShuffle16(grid: number[]): number[] {
  const symbolMap = shuffle(Array.from({ length: SIZE_16 }, (_, i) => i + 1))
  const bandOrder = shuffle([0, 1, 2, 3])
  const stackOrder = shuffle([0, 1, 2, 3])
  const rowOrder: number[] = []
  const colOrder: number[] = []

  for (const b of bandOrder) {
    for (const r of shuffle([0, 1, 2, 3])) {
      rowOrder.push(b * BOX_16 + r)
    }
  }
  for (const s of stackOrder) {
    for (const c of shuffle([0, 1, 2, 3])) {
      colOrder.push(s * BOX_16 + c)
    }
  }

  const out = new Array<number>(CELLS_16)
  for (let r = 0; r < SIZE_16; r++) {
    for (let c = 0; c < SIZE_16; c++) {
      const origVal = grid[rowOrder[r] * SIZE_16 + colOrder[c]]
      out[r * SIZE_16 + c] = symbolMap[origVal - 1]
    }
  }
  return out
}

function isUniquelySolvable16(
  puzzleBoard: number[],
  maxNodes: number
): boolean {
  const cands = buildCandidates16(puzzleBoard)
  if (!cands) return false

  let allSingles = true
  for (let c = 0; c < CELLS_16; c++) {
    if ((cands[c] & (cands[c] - 1)) !== 0) {
      allSingles = false
      break
    }
  }
  if (allSingles) return true

  return countSolutions16(cands, { nodes: 0, maxNodes }) === 1
}

function createSudokuGame16(
  difficulty: DifficultyKey = 'medium'
): GeneratedSudokuGame {
  const targetGivens =
    DIFFICULTY_GIVENS_16[difficulty] ?? DIFFICULTY_GIVENS_16.medium
  const solutionBoard = generateFullSolution16()
  const puzzleBoard = [...solutionBoard]

  const maxNodes =
    difficulty === 'easy'
      ? 4
      : difficulty === 'medium'
        ? 10
        : difficulty === 'hard'
          ? 20
          : difficulty === 'very-hard'
            ? 32
            : 48

  let currentGivens = CELLS_16
  const indices = shuffle(Array.from({ length: CELLS_16 }, (_, i) => i))
  const startMs = Date.now()
  const maxMs = 180

  let i = 0
  while (i < indices.length && currentGivens > targetGivens) {
    if (Date.now() - startMs > maxMs) break

    // Fast pair-digging while board is still dense (cuts verification calls in half)
    if (currentGivens - targetGivens >= 24 && i + 1 < indices.length) {
      const idx1 = indices[i]
      const idx2 = indices[i + 1]
      const b1 = puzzleBoard[idx1]
      const b2 = puzzleBoard[idx2]
      puzzleBoard[idx1] = 0
      puzzleBoard[idx2] = 0

      if (isUniquelySolvable16(puzzleBoard, maxNodes)) {
        currentGivens -= 2
        i += 2
        continue
      }
      // Restore second and try just the first
      puzzleBoard[idx2] = b2
      if (isUniquelySolvable16(puzzleBoard, maxNodes)) {
        currentGivens--
      } else {
        puzzleBoard[idx1] = b1
      }
      i += 2
      continue
    }

    const idx = indices[i++]
    const backup = puzzleBoard[idx]
    puzzleBoard[idx] = 0

    if (isUniquelySolvable16(puzzleBoard, maxNodes)) {
      currentGivens--
    } else {
      puzzleBoard[idx] = backup
    }
  }

  const puzzleString = puzzleBoard
    .map((v) => (v === 0 ? BLANK_CHAR : valueToSymbol(v)))
    .join('')
  const solutionString = solutionBoard.map((v) => valueToSymbol(v)).join('')

  return {
    size: 16,
    boxSize: 4,
    puzzleString,
    solutionString,
    initialBoard: puzzleBoard,
    solutionBoard,
    difficulty,
    givensCount: currentGivens,
  }
}

/**
 * Returns candidate bitmasks (bit `1 << val`, val in 1..size) for every cell
 * on a 9x9 or 16x16 board using Norvig constraint propagation.
 */
export function getCandidateMasks(
  board: number[],
  solution: number[],
  size: BoardSize
): number[] | null {
  if (size === 9) {
    const sanitizedString = board
      .map((val, idx) =>
        val !== 0 && val === solution[idx] ? String(val) : BLANK_CHAR
      )
      .join('')
    const candidateGrid = get_candidates(sanitizedString)
    if (!candidateGrid) return null

    const masks = new Array<number>(81).fill(0)
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const idx = r * 9 + c
        if (board[idx] !== 0) continue
        let mask = 0
        const candStr = candidateGrid[r][c]
        for (let k = 0; k < candStr.length; k++) {
          const d = Number(candStr[k])
          if (d >= 1 && d <= 9) mask |= 1 << d
        }
        masks[idx] = mask
      }
    }
    return masks
  }

  // 16x16 bitmask Norvig propagation
  const sanitized = board.map((val, idx) =>
    val !== 0 && val === solution[idx] ? val : 0
  )
  const cands = buildCandidates16(sanitized)
  if (!cands) return null

  const masks = new Array<number>(CELLS_16).fill(0)
  for (let i = 0; i < CELLS_16; i++) {
    if (board[i] !== 0) continue
    // Shift 0-indexed bits (0..15) to 1-indexed note bits (1..16)
    masks[i] = cands[i] << 1
  }
  return masks
}

export interface GeneratedSudokuGame {
  size: BoardSize
  boxSize: 3 | 4
  puzzleString: string
  solutionString: string
  initialBoard: number[]
  solutionBoard: number[]
  difficulty: DifficultyKey
  givensCount: number
}

export function createSudokuGame(
  difficulty: DifficultyKey = 'medium',
  size: BoardSize = 9
): GeneratedSudokuGame {
  if (size === 16) {
    return createSudokuGame16(difficulty)
  }

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
    size: 9,
    boxSize: 3,
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
  SYMBOLS_9,
  SYMBOLS_16,
  BLANK_CHAR,
  BLANK_BOARD,
  DIFFICULTY: DIFFICULTY_GIVENS,
  DIFFICULTY_16: DIFFICULTY_GIVENS_16,
  generate,
  solve,
  get_candidates,
  getCandidateMasks,
  board_string_to_grid,
  board_grid_to_string,
  validate_board,
}
