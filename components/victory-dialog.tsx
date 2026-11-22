'use client'

import React, { useEffect, useState } from 'react'
import { BoxIcon, RefreshCwIcon, TrophyIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getDifficultyLevels, type DifficultyKey } from '@/lib/sudoku-js'
import {
  formatDuration,
  type SudokuGameController,
} from '@/hooks/use-sudoku-game'

export function VictoryDialog({ game }: { game: SudokuGameController }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (game.isWon) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [game.isWon])

  const levels = getDifficultyLevels(game.boardSize)
  const currentMeta =
    levels.find((d) => d.key === game.difficulty) ?? levels[1]

  const nextLevelIdx = Math.min(
    levels.length - 1,
    levels.findIndex((d) => d.key === game.difficulty) + 1
  )
  const nextLevel = levels[nextLevelIdx]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-highlight/20 text-highlight">
            <TrophyIcon className="size-6" />
          </div>
          <DialogTitle className="text-xl font-bold">
            ¡Sudoku {game.boardSize}×{game.boardSize} completado!
          </DialogTitle>
          <DialogDescription>
            Has resuelto correctamente las {game.totalCells} celdas en el nivel{' '}
            <strong>{currentMeta.label}</strong> ({game.givensCount} pistas).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2.5 rounded-xl border bg-muted/40 p-3 text-center">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Tiempo</span>
            <span className="font-mono text-base font-bold">
              {formatDuration(game.elapsedSeconds)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Errores</span>
            <span className="font-mono text-base font-bold">
              {game.mistakes}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Pistas</span>
            <span className="font-mono text-base font-bold">
              {game.hintsUsed}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => {
              game.setMode('3d')
              setOpen(false)
            }}
          >
            <BoxIcon data-icon="inline-start" />
            Admirar en 3D
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                game.startNewGame(game.difficulty, game.boardSize)
                setOpen(false)
              }}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Repetir nivel
            </Button>
            {nextLevel.key !== game.difficulty && (
              <Button
                onClick={() => {
                  game.startNewGame(
                    nextLevel.key as DifficultyKey,
                    game.boardSize
                  )
                  setOpen(false)
                }}
              >
                Subir a {nextLevel.shortLabel}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
