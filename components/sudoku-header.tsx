'use client'

import React from 'react'
import Image from 'next/image'
import {
  BoxIcon,
  DownloadIcon,
  Grid3x3Icon,
  HelpCircleIcon,
  MoonIcon,
  RefreshCwIcon,
  SunIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { usePwaInstall } from '@/components/pwa-register'
import { DIFFICULTY_LEVELS, type DifficultyKey } from '@/lib/sudoku-js'
import type { SudokuGameController, ViewMode } from '@/hooks/use-sudoku-game'

const SELECT_ITEMS = DIFFICULTY_LEVELS.map((lvl) => ({
  value: lvl.key,
  label: `${lvl.shortLabel} (${lvl.givens})`,
}))

interface SudokuHeaderProps {
  game: SudokuGameController
  onOpenHelp: (tab?: 'pwa' | 'rules') => void
}

export function SudokuHeader({ game, onOpenHelp }: SudokuHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { isStandalone, promptInstall } = usePwaInstall()

  const handleInstallClick = async () => {
    const result = await promptInstall()
    if (result === 'accepted') {
      toast.success('KUBIK Sudoku se está instalando en tu dispositivo.')
    } else if (result === 'manual') {
      onOpenHelp('pwa')
    }
  }

  return (
    <header className="w-full border-b bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5 sm:py-2.5">
        {/* Brand Identity */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/icons/icon-192.png"
            alt="Icono de KUBIK Sudoku 3D"
            width={34}
            height={34}
            className="size-8 rounded-lg border shadow-xs sm:size-9"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm leading-none font-bold tracking-tight sm:text-base">
                KUBIK
              </h1>
              <span className="rounded bg-primary/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                PWA
              </span>
            </div>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Sudoku 3D Three.js &amp; 2D Clásico
            </p>
          </div>
        </div>

        {/* Center Switcher: 3D vs 2D Classic */}
        <div className="order-3 flex w-full items-center justify-between gap-2 sm:order-2 sm:w-auto sm:justify-center">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[game.mode]}
            onValueChange={(vals) => {
              const next = vals[0] as ViewMode | undefined
              if (next) game.setMode(next)
            }}
            aria-label="Modo de visualización del tablero"
          >
            <ToggleGroupItem
              value="3d"
              aria-label="Modo 3D con Three.js"
              className="px-2.5 text-xs font-medium data-pressed:bg-primary data-pressed:text-primary-foreground"
            >
              <BoxIcon data-icon="inline-start" />
              3D Three.js
            </ToggleGroupItem>
            <ToggleGroupItem
              value="2d"
              aria-label="Modo 2D clásico"
              className="px-2.5 text-xs font-medium data-pressed:bg-primary data-pressed:text-primary-foreground"
            >
              <Grid3x3Icon data-icon="inline-start" />
              2D Clásico
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Difficulty Selector + New Game */}
          <div className="flex items-center gap-1.5">
            <Select
              items={SELECT_ITEMS}
              value={game.difficulty}
              onValueChange={(val) => {
                if (val) {
                  game.startNewGame(val as DifficultyKey)
                  const meta = DIFFICULTY_LEVELS.find((d) => d.key === val)
                  if (meta) {
                    toast.info(`Nuevo Sudoku: ${meta.label} (${meta.givens} pistas)`)
                  }
                }
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label="Seleccionar nivel de dificultad"
                className="min-w-29 font-medium sm:min-w-34"
              >
                <SelectValue placeholder="Nivel" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} side="bottom" align="end">
                <SelectGroup>
                  {DIFFICULTY_LEVELS.map((lvl) => (
                    <SelectItem key={lvl.key} value={lvl.key}>
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-medium">{lvl.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {lvl.givens} pistas
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                game.startNewGame(game.difficulty)
                toast.info('Nuevo tablero generado')
              }}
              title="Generar nuevo Sudoku en este nivel"
            >
              <RefreshCwIcon data-icon="inline-start" />
              <span className="hidden md:inline">Nuevo</span>
            </Button>
          </div>
        </div>

        {/* Right Utility Actions */}
        <div className="order-2 flex items-center gap-1 sm:order-3">
          {!isStandalone && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstallClick}
              title="Instalar aplicación web progresiva (PWA)"
            >
              <DownloadIcon data-icon="inline-start" />
              <span className="hidden md:inline">Instalar</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => game.setSoundEnabled(!game.soundEnabled)}
            aria-label={
              game.soundEnabled ? 'Silenciar efectos de sonido' : 'Activar efectos de sonido'
            }
            title={game.soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
          >
            {game.soundEnabled ? <Volume2Icon /> : <VolumeXIcon />}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() =>
              setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
            }
            aria-label="Cambiar tema claro u oscuro"
            title="Cambiar tema"
          >
            {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenHelp('rules')}
            aria-label="Guía de controles e instalación PWA"
            title="Ayuda y atajos"
          >
            <HelpCircleIcon />
          </Button>
        </div>
      </div>
    </header>
  )
}
