"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Point = { x: number; y: number }

const BOARD_SIZE = 20
const INITIAL_SPEED_MS = 150

function randomEmptyCell(occupied: Point[]): Point {
  const taken = new Set(occupied.map(p => `${p.x},${p.y}`))
  while (true) {
    const x = Math.floor(Math.random() * BOARD_SIZE)
    const y = Math.floor(Math.random() * BOARD_SIZE)
    const key = `${x},${y}`
    if (!taken.has(key)) return { x, y }
  }
}

export default function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }])
  const [dir, setDir] = useState<Point>({ x: 1, y: 0 })
  const [food, setFood] = useState<Point>({ x: 14, y: 10 })
  const [running, setRunning] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [active, setActive] = useState(true) // active when game is focused/hovered
  const speedRef = useRef(INITIAL_SPEED_MS)

  const onKey = useCallback((e: KeyboardEvent) => {
    if (!active) return
    const k = e.key.toLowerCase()
    if (k.startsWith('arrow')) e.preventDefault()
    if (!running || gameOver) return
    if ((k === 'arrowup' || k === 'w') && dir.y !== 1) setDir({ x: 0, y: -1 })
    if ((k === 'arrowdown' || k === 's') && dir.y !== -1) setDir({ x: 0, y: 1 })
    if ((k === 'arrowleft' || k === 'a') && dir.x !== 1) setDir({ x: -1, y: 0 })
    if ((k === 'arrowright' || k === 'd') && dir.x !== -1) setDir({ x: 1, y: 0 })
  }, [dir, running, gameOver, active])

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  const step = useCallback(() => {
    setSnake(prev => {
      const head = prev[0]
      const next: Point = { x: head.x + dir.x, y: head.y + dir.y }

      // collisions (walls)
      if (next.x < 0 || next.y < 0 || next.x >= BOARD_SIZE || next.y >= BOARD_SIZE) {
        setRunning(false)
        setGameOver(true)
        return prev
      }
      // collisions (self)
      if (prev.some(p => p.x === next.x && p.y === next.y)) {
        setRunning(false)
        setGameOver(true)
        return prev
      }

      const ate = (next.x === food.x && next.y === food.y)
      const newSnake = [next, ...prev]
      if (!ate) newSnake.pop()
      else {
        setScore(s => s + 1)
        setFood(randomEmptyCell(newSnake))
        // slightly increase difficulty
        speedRef.current = Math.max(70, speedRef.current - 5)
      }
      return newSnake
    })
  }, [dir, food])

  useEffect(() => {
    if (!running || gameOver) return
    const id = setInterval(step, speedRef.current)
    return () => clearInterval(id)
  }, [running, gameOver, step])

  const cells = useMemo(() => {
    const grid: string[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(''))
    snake.forEach((p, i) => {
      grid[p.y][p.x] = i === 0 ? 'head' : 'body'
    })
    grid[food.y][food.x] = 'food'
    return grid
  }, [snake, food])

  const start = () => {
    setSnake([{ x: 10, y: 10 }])
    setDir({ x: 1, y: 0 })
    setFood({ x: 14, y: 10 })
    setScore(0)
    setGameOver(false)
    speedRef.current = INITIAL_SPEED_MS
    setRunning(true)
  }

  const pause = () => setRunning(r => !gameOver && !r ? true : !r)

  const cellClass = (val: string) => {
    if (val === 'head') return 'bg-[var(--accent-primary)]'
    if (val === 'body') return 'bg-[var(--spotify-green)]'
    if (val === 'food') return 'bg-[var(--accent-error)]'
    return 'bg-[var(--surface-secondary)]'
  }

  return (
    <div
      tabIndex={0}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      aria-label="Snake game"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-[var(--text-secondary)]">Score: <span className="text-[var(--text-primary)] font-semibold">{score}</span></div>
        <div className="flex gap-2">
          {!running && !gameOver && (
            <button onClick={start} className="px-3 py-1 rounded bg-[var(--spotify-green)]/20 text-[var(--text-primary)] text-sm hover:bg-[var(--spotify-green)]/30">Start</button>
          )}
          {running && (
            <button onClick={pause} className="px-3 py-1 rounded bg-[var(--surface-secondary)] text-[var(--text-primary)] text-sm hover:bg-[var(--surface-elevated)]">Pause</button>
          )}
          {!running && (
            <button onClick={start} className="px-3 py-1 rounded bg-[var(--accent-primary)]/20 text-[var(--text-primary)] text-sm hover:bg-[var(--accent-primary)]/30">Restart</button>
          )}
        </div>
      </div>
      <div className="rounded-xl p-2 bg-[var(--surface-tertiary)] border border-[var(--border-primary)]">
        <div className="w-full max-w-[420px] aspect-square mx-auto">
          <div
            className="grid gap-[2px] w-full h-full"
            style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}
          >
            {cells.flatMap((row, y) =>
              row.map((val, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`w-full h-full rounded-[2px] ${cellClass(val)}`}
                  title={`${x},${y}`}
                />
              ))
            )}
          </div>
        </div>
      </div>
      {gameOver && (
        <div className="mt-3 text-center text-sm text-[var(--accent-error)]">Game Over • Final Score: {score}</div>
      )}
      <div className="mt-3 text-xs text-[var(--text-tertiary)]">
        <div className="mb-1">Controls: Arrow keys or WASD. Eat the red squares to grow. Avoid walls and yourself.</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[var(--accent-primary)]"></span> Head</div>
          <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[var(--spotify-green)]"></span> Body</div>
          <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[var(--accent-error)]"></span> Food</div>
        </div>
      </div>
    </div>
  )
}
