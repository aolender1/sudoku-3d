'use client'

import React from 'react'
import {
  BoxIcon,
  CheckCircle2Icon,
  DownloadIcon,
  KeyboardIcon,
  SmartphoneIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePwaInstall } from '@/components/pwa-register'
import { DIFFICULTY_LEVELS } from '@/lib/sudoku-js'

interface HelpPwaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSection?: 'pwa' | 'rules'
}

export function HelpPwaDialog({
  open,
  onOpenChange,
}: HelpPwaDialogProps) {
  const { canPromptNatively, isStandalone, swReady, promptInstall } =
    usePwaInstall()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Guía de Juego e Instalación PWA
          </DialogTitle>
          <DialogDescription>
            KUBIK combina un tablero arquitectónico 3D en Three.js con el modo
            2D clásico e incluye el generador <code>robatron/sudoku.js</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1 text-sm">
          {/* 3D & 2D Modes */}
          <section className="flex flex-col gap-1.5 rounded-xl border bg-muted/35 p-3">
            <div className="flex items-center gap-2 font-semibold">
              <BoxIcon className="size-4 text-primary" />
              <span>Modo 3D (Three.js) y Torres 1–9</span>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              Alterna en cualquier momento entre <strong>3D Three.js</strong> y{' '}
              <strong>2D Clásico</strong> conservando tu partida exacta. En 3D
              puedes orbitar arrastrando, hacer zoom con dos dedos y activar{' '}
              <strong>Torres 1–9</strong> para que la altura física de cada ficha
              represente su valor numérico.
            </p>
          </section>

          {/* Difficulty Levels from sudoku.js */}
          <section className="flex flex-col gap-2 rounded-xl border bg-muted/35 p-3">
            <span className="font-semibold">
              6 Niveles de Dificultad (robatron/sudoku.js)
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {DIFFICULTY_LEVELS.map((lvl) => (
                <div
                  key={lvl.key}
                  className="flex items-center justify-between rounded-md border bg-card px-2 py-1"
                >
                  <span className="font-medium">{lvl.label}</span>
                  <span className="font-mono text-muted-foreground">
                    {lvl.givens} pistas
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="flex flex-col gap-1.5 rounded-xl border bg-muted/35 p-3">
            <div className="flex items-center gap-2 font-semibold">
              <KeyboardIcon className="size-4 text-primary" />
              <span>Controles Rápidos</span>
            </div>
            <ul className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
              <li>
                <strong className="font-mono text-foreground">1 – 9</strong>:
                Colocar número / nota
              </li>
              <li>
                <strong className="font-mono text-foreground">Flechas</strong>:
                Mover celda activa
              </li>
              <li>
                <strong className="font-mono text-foreground">N</strong>: Modo
                notas de lápiz
              </li>
              <li>
                <strong className="font-mono text-foreground">Candidatos</strong>
                : Calcula opciones lógicas
              </li>
              <li>
                <strong className="font-mono text-foreground">Z</strong>:
                Deshacer jugada
              </li>
              <li>
                <strong className="font-mono text-foreground">H</strong>: Pedir
                pista inteligente
              </li>
            </ul>
          </section>

          {/* PWA Install Section */}
          <section className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/8 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <SmartphoneIcon className="size-4 text-primary" />
                <span>Instalar como App Móvil / Escritorio (PWA)</span>
              </div>
              <Badge variant={swReady ? 'secondary' : 'outline'}>
                {isStandalone
                  ? 'Instalada'
                  : swReady
                    ? 'Lista sin conexión'
                    : 'PWA Activa'}
              </Badge>
            </div>

            {isStandalone ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2Icon className="size-4 text-primary" />
                Ya estás ejecutando KUBIK Sudoku como aplicación instalada.
              </p>
            ) : (
              <div className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
                {canPromptNatively && (
                  <Button
                    size="sm"
                    onClick={() => {
                      promptInstall()
                      onOpenChange(false)
                    }}
                    className="w-fit"
                  >
                    <DownloadIcon data-icon="inline-start" />
                    Instalar ahora
                  </Button>
                )}
                <p>
                  <strong>En iPhone / iPad (Safari):</strong> Toca el botón{' '}
                  <em>Compartir</em> en la barra inferior y elige{' '}
                  <strong>&laquo;Añadir a pantalla de inicio&raquo;</strong>.
                </p>
                <p>
                  <strong>En Android / Chrome / Edge:</strong> Abre el menú del
                  navegador (⋮) y selecciona{' '}
                  <strong>&laquo;Instalar aplicación&raquo;</strong>. Funciona
                  100% sin conexión.
                </p>
              </div>
            )}
          </section>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
