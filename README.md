# KUBIK Sudoku — Sudoku 3D (Three.js) y 2D Clásico | PWA

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-049EF4?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?style=flat-square)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)

**KUBIK Sudoku** es una aplicación web progresiva (PWA) de Sudoku táctil y espacial construida con **Next.js 16**, **React 19**, **Three.js** y **TypeScript**. Permite alternar en tiempo real entre un **tablero arquitectónico 3D interactivo** con torres volumétricas proporcionales (alturas `1–9`) y una **cuadrícula 2D clásica** de alta legibilidad, manteniendo sincronizados el progreso, las notas de candidatos, el historial de movimientos y el cronómetro.

Repositorio oficial: [github.com/aolender1/sudoku-3d](https://github.com/aolender1/sudoku-3d)

---

## Características principales

- **Doble vista sincronizada en tiempo real (3D y 2D)**
  - **Modo 3D (Three.js nativo):** tablero sobre pedestal biselado con coordenadas `A–I` y `1–9`, bloques volumétricos cuya elevación refleja el valor numérico (`1–9`), iluminación física suave, sombras dinámicas, `OrbitControls` con paneo/rotación/zoom táctil y tres vistas preconfiguradas de cámara (*Isométrica*, *Cenital* e *Inclinada*).
  - **Modo 2D Clásico:** cuadrícula accesible y responsiva con resaltado instantáneo de fila, columna, subcuadrícula `3x3`, celdas con el mismo dígito y conflictos en tiempo real.
- **Motor algorítmico `sudoku.js` en TypeScript**
  - Generación y resolución determinista basada en propagación de restricciones y búsqueda heurística (inspirada en el algoritmo de Peter Norvig y `robatron/sudoku.js`).
- **Herramientas avanzadas de resolución**
  - **Modo Notas (Lápiz):** máscaras de bits por celda para anotar candidatos `1–9` con limpieza automática en celdas vecinas al confirmar un valor.
  - **Autocandidatos:** cálculo instantáneo de todos los candidatos válidos restantes del tablero.
  - **Pistas inteligentes, Deshacer ilimitado y Borrado rápido.**
  - **Detección de conflictos:** validación inmediata frente a repeticiones en fila, columna, bloque `3x3` y solución del tablero.
- **Audio sintético táctil (Web Audio API)**
  - Efectos sonoros generados proceduralmente sin archivos externos (selección, colocación, notas, pistas y fanfarria de victoria), con opción de silencio rápido.
- **Aplicación Web Progresiva (PWA) instalable**
  - Manifiesto web nativo (`app/manifest.ts`), iconos dedicados (`192x192`, `512x512`, `apple-icon`) y Service Worker (`public/sw.js`) con estrategia *network-first* y respaldo *offline* para jugar sin conexión en escritorio, Android e iOS.
- **Tema Oscuro y Claro adaptativo**
  - Sistema de tokens de diseño semánticos en Tailwind CSS v4 y sincronización automática de materiales e iluminación en la escena 3D según el tema activo.

---

## Niveles de dificultad

| Nivel | Clave interna | Pistas iniciales (*Givens*) | Perfil de juego |
| :--- | :--- | :---: | :--- |
| **Fácil** | `easy` | 62 | Ideal para familiarizarse con la vista espacial 3D |
| **Medio** | `medium` | 53 | Equilibrio clásico de deducción directa |
| **Difícil** | `hard` | 44 | Requiere uso sistemático de notas de candidatos |
| **Muy Difícil** | `very-hard` | 35 | Deducción avanzada e intersecciones por bloques |
| **Experto** | `insane` | 26 | Nivel maestro de alta exigencia lógica |
| **Inhumano** | `inhuman` | 17 | Mínimo matemático posible para un Sudoku con solución única |

---

## Controles y atajos de teclado

| Acción | Teclado / Ratón / Táctil |
| :--- | :--- |
| **Seleccionar celda** | Clic / toque sobre la celda (3D o 2D) o flechas de dirección (`↑` `↓` `←` `→`) / `W` `A` `S` `D` |
| **Ingresar número (`1–9`)** | Teclas `1` a `9` (fila superior o teclado numérico) o panel numérico lateral/inferior |
| **Alternar Modo Notas** | Tecla `N` o botón **Notas** |
| **Borrar celda** | `Backspace`, `Delete` o `0` |
| **Deshacer movimiento** | `Ctrl + Z` / `Cmd + Z` o botón **Deshacer** |
| **Orbitar / Zoom / Desplazar (3D)** | Arrastrar con clic izquierdo (orbitar), rueda o pellizco (zoom), clic derecho o dos dedos (desplazar) |

---

## Stack tecnológico

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Librería UI:** [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), componentes accesibles con [shadcn/ui](https://ui.shadcn.com/) y `@base-ui/react`
- **Motor Gráfico 3D:** [Three.js](https://threejs.org/) (`WebGLRenderer`, `OrbitControls`, texturas dinámicas en Canvas 2D de alta densidad DPI y geometrías reutilizables)
- **Tipografía:** `Space Grotesk` (interfaz y numeración principal) y `JetBrains Mono` (cronómetro, métricas y coordenadas)
- **Iconografía y Notificaciones:** `lucide-react` y `sonner`
- **Lenguaje:** [TypeScript 5](https://www.typescriptlang.org/)

---

## Estructura del proyecto

```text
sudoku-3d/
├── app/
│   ├── globals.css            # Tokens semánticos de color y estilos base (Tailwind CSS v4)
│   ├── layout.tsx             # Metadatos SEO/PWA, fuentes y proveedores globales
│   ├── manifest.ts            # Web App Manifest para instalación PWA
│   └── page.tsx               # Composición principal del tablero y panel de control
├── components/
│   ├── sudoku-board-3d.tsx    # Escena interactiva Three.js, raycasting, cámaras y torres 3D
│   ├── sudoku-board-2d.tsx    # Cuadrícula 2D clásica accesible y responsiva
│   ├── sudoku-controls.tsx    # Teclado numérico 1-9, acciones de juego e indicadores de conteo
│   ├── sudoku-header.tsx      # Selector 3D/2D, dificultad, cronómetro, tema, audio y ayuda
│   ├── victory-dialog.tsx     # Resumen de partida al completar el Sudoku
│   ├── help-pwa-dialog.tsx    # Reglas del juego, atajos e instrucciones de instalación PWA
│   ├── pwa-register.tsx       # Registro del Service Worker y gestión del evento de instalación
│   └── ui/                    # Primitivos de interfaz reutilizables
├── hooks/
│   └── use-sudoku-game.ts     # Estado central del juego, validación, notas y atajos globales
├── lib/
│   ├── sudoku-js.ts           # Generador, solucionador y calculador de candidatos Sudoku
│   ├── sound-fx.ts            # Sintetizador de efectos táctiles mediante Web Audio API
│   └── utils.ts               # Utilidades de clases y formato
└── public/
    ├── sw.js                  # Service Worker con soporte offline (caché v2 network-first)
    └── icons/                 # Iconos de aplicación PWA (192x192, 512x512 y Apple Touch Icon)
```

---

## Instalación y ejecución local

### Requisitos previos

- **Node.js** `>= 20.x`
- **pnpm** (recomendado) o `npm`

### Pasos

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/aolender1/sudoku-3d.git
   cd sudoku-3d
   ```

2. **Instalar dependencias:**

   ```bash
   pnpm install
   ```

3. **Iniciar el servidor de desarrollo:**

   ```bash
   pnpm dev
   ```

   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

4. **Compilar para producción:**

   ```bash
   pnpm build
   pnpm start
   ```

---

## Instalación como PWA

- **Escritorio (Chrome, Edge, Brave):** haz clic en el botón **Instalar** de la barra superior o en el icono de instalación de la barra de direcciones.
- **Android (Chrome):** pulsa **Instalar** en la cabecera o abre el menú del navegador y selecciona *Instalar aplicación* / *Añadir a pantalla de inicio*.
- **iOS / iPadOS (Safari):** pulsa el botón *Compartir* y selecciona *Añadir a pantalla de inicio*.

---

## Autor

Creado por **aolender** — [github.com/aolender1](https://github.com/aolender1/)

- Proyecto: [github.com/aolender1/sudoku-3d](https://github.com/aolender1/sudoku-3d)

---

## Licencia

Este proyecto se distribuye bajo la **Licencia MIT**. Consulta el archivo [LICENSE](./LICENSE) para ver el texto completo.
