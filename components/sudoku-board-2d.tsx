'use client'

import React from 'react'
import { PlayIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hasNote, type SudokuGameController } from '@/hooks/use-sudoku-game'
import { valueToSymbol } from '@/lib/sudoku-js'
import { cn } from '@/lib/utils'

const ROW_LETTERS_9 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

export function SudokuBoard2D({ game }: { game: SudokuGameController }) {
  const size = game.boardSize
  const boxSize = game.boxSize
  const isHex = size === 16

  return (
    <div className="relative flex w-full flex-1 items-center justify-center py-1">
      <div
        className={cn(
          'relative aspect-square w-full',
          isHex
            ? 'max-w-[min(100%,560px)] lg:max-w-[610px]'
            : 'max-w-[min(100%,460px)] lg:max-w-[520px]'
        )}
      >
        {/* Subtle Coordinate Headers */}
        <div
          className="mb-1 hidden px-0.5 text-center font-mono text-[10px] font-medium text-muted-foreground sm:grid"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {Array.from({ length: size }, (_, c) => (
            <span key={c}>{c + 1}</span>
          ))}
        </div>

        <div
          role="grid"
          aria-label={
            isHex
              ? 'Tablero de Sudoku Hexadoku 16 por 16 con cajas 4 por 4'
              : 'Tablero de Sudoku clásico 9 por 9'
          }
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
          }}
          className="relative grid aspect-square w-full overflow-hidden rounded-xl border-2 border-grid-strong bg-card shadow-sm"
        >
          {game.board.map((digit, idx) => {
            const row = Math.floor(idx / size)
            const col = idx % size
            const isGiven = game.initialBoard[idx] !== 0
            const isSelected = game.selectedIndex === idx
            const isPeer = game.peerSet.has(idx)
            const isConflict = game.conflicts.has(idx)
            const isLastHint = game.lastHintIndex === idx
            const isSameDigit =
              digit !== 0 &&
              game.activeHighlightDigit !== null &&
              digit === game.activeHighlightDigit &&
              !isSelected
            const notesMask = game.notes[idx]
            const altBox =
              (Math.floor(row / boxSize) + Math.floor(col / boxSize)) % 2 === 1

            const rightBorder =
              (col + 1) % boxSize === 0 && col < size - 1
                ? 'border-r-2 border-r-grid-strong'
                : col < size - 1
                  ? 'border-r border-r-border'
                  : ''

            const bottomBorder =
              (row + 1) % boxSize === 0 && row < size - 1
                ? 'border-b-2 border-b-grid-strong'
                : row < size - 1
                  ? 'border-b border-b-border'
                  : ''

            const symbol = digit !== 0 ? valueToSymbol(digit) : ''
            const rowLabel = isHex ? `F${row + 1}` : ROW_LETTERS_9[row]

            return (
              <button
                key={idx}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-label={`Fila ${rowLabel}, Columna ${col + 1}${
                  digit !== 0
                    ? `, valor ${symbol}${isGiven ? ' fijo' : ''}${isConflict ? ', en conflicto' : ''}`
                    : ', vacía'
                }`}
                onClick={() => game.selectCell(idx)}
                className={cn(
                  'relative flex items-center justify-center font-mono transition-colors select-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  rightBorder,
                  bottomBorder,
                  altBox ? 'bg-muted/35' : 'bg-card',
                  isPeer && !isSelected && 'bg-accent/55',
                  isSameDigit && 'bg-highlight/25',
                  isLastHint && 'bg-highlight/35',
                  isConflict && !isSelected && 'bg-destructive/15 animate-conflict',
                  isSelected &&
                    (isConflict
                      ? 'bg-destructive text-primary-foreground ring-2 ring-inset ring-destructive'
                      : 'bg-primary text-primary-foreground ring-2 ring-inset ring-primary')
                )}
              >
                {digit !== 0 ? (
                  <>
                    <span
                      className={cn(
                        'leading-none',
                        isHex
                          ? 'text-[11px] sm:text-sm md:text-[15px]'
                          : 'text-lg sm:text-2xl',
                        isGiven ? 'font-bold' : 'font-semibold',
                        !isSelected && isConflict && 'text-destructive',
                        !isSelected && !isConflict && isGiven && 'text-foreground',
                        !isSelected && !isConflict && !isGiven && 'text-primary'
                      )}
                    >
                      {symbol}
                    </span>
                    {isGiven && !isHex && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute top-1 right-1 size-1 rounded-full',
                          isSelected
                            ? 'bg-primary-foreground/70'
                            : 'bg-muted-foreground/45'
                        )}
                      />
                    )}
                  </>
                ) : notesMask !== 0 ? (
                  <span
                    aria-hidden="true"
                    style={{
                      gridTemplateColumns: `repeat(${boxSize}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${boxSize}, minmax(0, 1fr))`,
                    }}
                    className={cn(
                      'grid size-full leading-none',
                      isHex
                        ? 'p-[1px] text-[5.5px] sm:text-[7px]'
                        : 'p-0.5 text-[9px] sm:text-[11px]'
                    )}
                  >
                    {Array.from({ length: size }, (_, nIdx) => {
                      const d = nIdx + 1
                      const active = hasNote(notesMask, d)
                      const isMatch =
                        active && game.activeHighlightDigit === d
                      return (
                        <span
                          key={d}
                          className={cn(
                            'flex items-center justify-center rounded-[2px] font-medium',
                            !active && 'opacity-0',
                            active &&
                              !isSelected &&
                              !isMatch &&
                              'text-muted-foreground',
                            active && isSelected && 'text-primary-foreground/90',
                            isMatch &&
                              !isSelected &&
                              'bg-highlight/35 font-bold text-foreground'
                          )}
                        >
                          {active ? valueToSymbol(d) : ''}
                        </span>
                      )
                    })}
                  </span>
                ) : null}
              </button>
            )
          })}

          {/* Pause Veil */}
          {game.isPaused && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/92 p-4 text-center backdrop-blur-md">
              <p className="text-lg font-semibold tracking-tight">
                Partida en pausa
              </p>
              <p className="max-w-xs text-sm text-muted-foreground">
                El tablero está oculto mientras el cronómetro permanece en pausa.
              </p>
              <Button onClick={() => game.setIsPaused(false)}>
                <PlayIcon data-icon="inline-start" />
                Reanudar partida
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
