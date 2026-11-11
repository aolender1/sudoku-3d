'use client'

import React from 'react'
import {
  EraserIcon,
  LightbulbIcon,
  PauseIcon,
  PencilIcon,
  PinIcon,
  PlayIcon,
  RotateCcwIcon,
  SparklesIcon,
  Undo2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DIFFICULTY_LEVELS } from '@/lib/sudoku-js'
import {
  formatDuration,
  type SudokuGameController,
} from '@/hooks/use-sudoku-game'
import { cn } from '@/lib/utils'

export function SudokuControls({ game }: { game: SudokuGameController }) {
  const currentDifficultyMeta =
    DIFFICULTY_LEVELS.find((d) => d.key === game.difficulty) ??
    DIFFICULTY_LEVELS[1]

  const progressPct = Math.round((game.filledCorrectCount / 81) * 100)

  const handleAutoNotes = () => {
    game.fillSmartCandidates()
    toast.success('Candidatos calculados con sudoku.js')
  }

  return (
    <aside
      aria-label="Controles de juego y teclado numérico"
      className="flex w-full flex-col gap-2.5 rounded-2xl border bg-card p-3 shadow-xs sm:p-4 lg:w-88 lg:shrink-0 lg:justify-between lg:gap-4"
    >
      {/* Top Telemetry Strip */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-medium">
              {currentDifficultyMeta.label}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              {game.filledCorrectCount}/81 ({progressPct}%)
            </span>
          </div>

          {/* Timer + Pause */}
          <button
            type="button"
            onClick={() => game.setIsPaused(!game.isPaused)}
            aria-label={game.isPaused ? 'Reanudar reloj' : 'Pausar reloj'}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1 font-mono text-xs font-semibold transition-colors hover:bg-muted"
          >
            {game.isPaused ? (
              <PlayIcon className="size-3.5 text-primary" />
            ) : (
              <PauseIcon className="size-3.5 text-muted-foreground" />
            )}
            <span>{formatDuration(game.elapsedSeconds)}</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={game.filledCorrectCount}
          aria-valuemin={0}
          aria-valuemax={81}
          aria-label="Progreso del tablero"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Mistakes & Hints Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              Errores:{' '}
              <strong
                className={cn(
                  'font-mono font-semibold',
                  game.mistakes > 0 ? 'text-destructive' : 'text-foreground'
                )}
              >
                {game.mistakes}
              </strong>
            </span>
            <span>
              Pistas:{' '}
              <strong className="font-mono font-semibold text-foreground">
                {game.hintsUsed}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={game.resetCurrentBoard}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            title="Reiniciar el mismo tablero desde cero"
          >
            <RotateCcwIcon className="size-3" />
            Reiniciar
          </button>
        </div>
      </div>

      <Separator className="hidden lg:block" />

      {/* Action Tool Buttons */}
      <div className="grid grid-cols-5 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={game.undo}
          disabled={game.historyCount === 0 || game.isPaused || game.isWon}
          className="flex h-12 flex-col gap-0.5 px-1 text-[11px]"
          title="Deshacer último movimiento (Z)"
        >
          <Undo2Icon className="size-4" />
          <span>Deshacer</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={game.eraseCell}
          disabled={
            game.selectedIndex === null ||
            game.initialBoard[game.selectedIndex] !== 0 ||
            game.isPaused ||
            game.isWon
          }
          className="flex h-12 flex-col gap-0.5 px-1 text-[11px]"
          title="Borrar celda seleccionada (Supr / Backspace)"
        >
          <EraserIcon className="size-4" />
          <span>Borrar</span>
        </Button>

        <Button
          variant={game.isNotesMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => game.setIsNotesMode(!game.isNotesMode)}
          disabled={game.isPaused || game.isWon}
          aria-pressed={game.isNotesMode}
          className="relative flex h-12 flex-col gap-0.5 px-1 text-[11px]"
          title="Alternar modo notas de lápiz (N)"
        >
          <PencilIcon className="size-4" />
          <span>{game.isNotesMode ? 'Notas ON' : 'Notas'}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoNotes}
          disabled={game.isPaused || game.isWon}
          className="flex h-12 flex-col gap-0.5 px-1 text-[11px]"
          title="Rellenar automáticamente candidatos posibles con sudoku.js"
        >
          <SparklesIcon className="size-4" />
          <span>Candidatos</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={game.useHint}
          disabled={game.isPaused || game.isWon}
          className="flex h-12 flex-col gap-0.5 px-1 text-[11px]"
          title="Revelar pista lógica (H)"
        >
          <LightbulbIcon className="size-4 text-highlight" />
          <span>Pista</span>
        </Button>
      </div>

      {/* 1-9 Tactile Number Pad */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {game.isNotesMode
              ? 'Modo Notas: anota candidatos'
              : game.lockedDigit !== null
                ? `Número ${game.lockedDigit} fijado: toca celdas`
                : 'Teclado numérico (1–9)'}
          </span>
          <Button
            variant={game.lockedDigit !== null ? 'default' : 'ghost'}
            size="xs"
            onClick={() => {
              if (game.lockedDigit !== null) {
                game.setLockedDigit(null)
              } else {
                const firstAvailable = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(
                  (d) => game.remainingDigits[d] > 0
                )
                game.setLockedDigit(firstAvailable ?? 1)
              }
            }}
            title="Fijar un número para rellenar varias celdas rápido con un toque"
          >
            <PinIcon data-icon="inline-start" />
            {game.lockedDigit !== null ? 'Fijado' : 'Fijar n.º'}
          </Button>
        </div>

        <div
          className="grid grid-cols-9 gap-1 sm:gap-1.5 lg:grid-cols-3 lg:gap-2"
          role="group"
          aria-label="Números del 1 al 9"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
            const left = game.remainingDigits[digit]
            const isCompleted = left === 0
            const isLocked = game.lockedDigit === digit
            const isHighlighted = game.activeHighlightDigit === digit

            return (
              <button
                key={digit}
                type="button"
                disabled={game.isPaused || game.isWon}
                onClick={() => game.inputDigit(digit)}
                aria-label={`Número ${digit}, faltan ${left}`}
                aria-pressed={isLocked}
                className={cn(
                  'group relative flex min-h-13 flex-col items-center justify-center rounded-xl border font-mono transition-all select-none active:scale-95 disabled:pointer-events-none disabled:opacity-40 lg:min-h-15',
                  isLocked
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : isHighlighted
                      ? 'border-primary/60 bg-primary/14 text-foreground'
                      : 'border-border bg-secondary/45 text-foreground hover:border-primary/40 hover:bg-secondary',
                  isCompleted && !isLocked && 'opacity-40'
                )}
              >
                <span className="text-lg leading-none font-bold sm:text-xl">
                  {digit}
                </span>
                <span
                  className={cn(
                    'mt-0.5 text-[10px] leading-none',
                    isLocked
                      ? 'text-primary-foreground/85'
                      : 'text-muted-foreground'
                  )}
                >
                  {isCompleted ? '✓' : left}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Subtle Desktop Shortcut Hint */}
      <p className="hidden text-center text-[11px] text-muted-foreground lg:block">
        Atajos: Flechas mover · 1–9 insertar · N notas · Z deshacer · H pista
      </p>
    </aside>
  )
}
