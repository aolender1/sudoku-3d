'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { SudokuHeader } from '@/components/sudoku-header'
import { SudokuBoard2D } from '@/components/sudoku-board-2d'
import { SudokuControls } from '@/components/sudoku-controls'
import { VictoryDialog } from '@/components/victory-dialog'
import { HelpPwaDialog } from '@/components/help-pwa-dialog'
import { useSudokuGame } from '@/hooks/use-sudoku-game'

const SudokuBoard3D = dynamic(
  () =>
    import('@/components/sudoku-board-3d').then((mod) => mod.SudokuBoard3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[45dvh] min-h-[310px] w-full flex-1 flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-6 sm:h-[52dvh] lg:h-[calc(100dvh-5.5rem)] lg:max-h-[780px] lg:min-h-[420px]">
        <Skeleton className="size-48 rounded-2xl sm:size-64" />
        <p className="font-mono text-xs text-muted-foreground">
          Cargando escena Three.js 3D...
        </p>
      </div>
    ),
  }
)

export default function SudokuPage() {
  const game = useSudokuGame()
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpSection, setHelpSection] = useState<'pwa' | 'rules'>('rules')

  const handleOpenHelp = (section: 'pwa' | 'rules' = 'rules') => {
    setHelpSection(section)
    setHelpOpen(true)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SudokuHeader game={game} onOpenHelp={handleOpenHelp} />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 px-2.5 py-2.5 sm:px-5 sm:py-4 lg:flex-row lg:items-stretch lg:gap-5">
        {/* Active 3D or 2D Board Stage */}
        <section
          aria-label={
            game.mode === '3d'
              ? 'Escenario Sudoku 3D interactivo'
              : 'Tablero Sudoku 2D clásico'
          }
          className="flex min-w-0 flex-col justify-center lg:flex-1"
        >
          {!game.isReady ? (
            <div className="flex h-[45dvh] min-h-[310px] w-full flex-1 flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-6 lg:h-[calc(100dvh-5.5rem)] lg:max-h-[780px] lg:min-h-[420px]">
              <Skeleton className="size-52 rounded-2xl sm:size-72" />
              <p className="font-mono text-xs text-muted-foreground">
                Generando tablero único con sudoku.js...
              </p>
            </div>
          ) : game.mode === '3d' ? (
            <SudokuBoard3D game={game} />
          ) : (
            <SudokuBoard2D game={game} />
          )}
        </section>

        {/* Controls & Keypad Panel */}
        <SudokuControls game={game} />
      </main>

      <VictoryDialog game={game} />
      <HelpPwaDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        initialSection={helpSection}
      />
    </div>
  )
}
