'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

/* ---------- DEMO CARDS (TEMP) ---------- */
/* Replace later with real user / club cards */
const DEMO_CARDS = [
  {
    id: 'meme-1',
    src: 'https://i.imgur.com/3ZQ3ZQp.png',
    label: 'meme',
  },
  {
    id: 'meme-2',
    src: 'https://i.imgur.com/8Km9tLL.png',
    label: 'fake id',
  },
  {
    id: 'meme-3',
    src: 'https://i.imgur.com/vxXQF6L.png',
    label: 'wallet card',
  },
  {
    id: 'meme-4',
    src: 'https://i.imgur.com/Qr71crq.png',
    label: 'club pass',
  },
  {
    id: 'meme-5',
    src: 'https://i.imgur.com/JYwZ5qN.png',
    label: 'chaos',
  },
  {
    id: 'meme-6',
    src: 'https://i.imgur.com/9yG6F5B.png',
    label: 'why not',
  },
]

/* ---------- UTILS ---------- */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStringToSeed(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/* ---------- COMPONENT ---------- */

export default function HeroStackGallery({
  title = 'Make stupid cards.',
  subtitle = 'Memes, fake IDs, club passes — add them to your wallet.',
  maxCards = 14,
  lowMotion = false,
  className,
}: {
  title?: string
  subtitle?: string
  maxCards?: number
  lowMotion?: boolean
  className?: string
}) {
  const cards = DEMO_CARDS

  const renderCards = useMemo(() => {
    const count = clamp(cards.length, 0, maxCards)
    const subset = cards.slice(0, count)

    return subset.map((c, idx) => {
      const seed = hashStringToSeed(c.id + ':' + idx)
      const rnd = mulberry32(seed)

      const left = rnd() * 100
      const top = rnd() * 100

      const dx = (left - 50) / 50
      const dy = (top - 50) / 50
      const push = 14 + rnd() * 26

      const leftPushed = clamp(left + dx * push, 4, 96)
      const topPushed = clamp(top + dy * push, 4, 96)

      const baseRot = (rnd() - 0.5) * 18
      const baseScale = 0.85 + rnd() * 0.45
      const baseOpacity = 0.28 + rnd() * 0.42

      const depth = rnd()
      const blurBase = 1 + (1 - depth) * 10

      const floatX = (rnd() - 0.5) * 120
      const floatY = (rnd() - 0.5) * 120
      const floatScale = depth * 0.12
      const floatRot = (rnd() - 0.5) * 8

      const duration = 14 + rnd() * 18
      const delay = rnd() * 3

      return {
        key: c.id,
        card: c,
        style: {
          left: `${leftPushed}%`,
          top: `${topPushed}%`,
          transform: `translate(-50%, -50%) rotate(${baseRot}deg) scale(${baseScale})`,
          opacity: baseOpacity,
          zIndex: Math.floor(20 + depth * 80),
          filter: `blur(${blurBase}px)`,
        } as React.CSSProperties,
        animate: lowMotion
          ? {}
          : {
              x: [0, floatX, floatX * -0.4, 0],
              y: [0, floatY, floatY * 0.6, 0],
              rotate: [
                baseRot,
                baseRot + floatRot,
                baseRot - floatRot * 0.6,
                baseRot,
              ],
              scale: [
                baseScale,
                baseScale + floatScale,
                baseScale - floatScale * 0.4,
                baseScale,
              ],
              opacity: [
                baseOpacity,
                baseOpacity + 0.12,
                baseOpacity - 0.08,
                baseOpacity,
              ],
              filter: [
                `blur(${blurBase}px)`,
                `blur(${blurBase - depth * 4}px)`,
                `blur(${blurBase + (1 - depth) * 4}px)`,
                `blur(${blurBase}px)`,
              ],
            },
        transition: {
          duration,
          delay,
          repeat: Infinity as number,
          ease: 'easeInOut' as const,
        },
      }
    })
  }, [cards, maxCards, lowMotion])

  return (
    <section
      className={[
        'relative w-full overflow-hidden rounded-3xl',
        'min-h-[520px] md:min-h-[680px]',
        'bg-neutral-950 text-neutral-50',
        className ?? '',
      ].join(' ')}
    >
      {/* Background cards */}
      <div className="absolute inset-0">
        {renderCards.map((r) => (
          <motion.div
            key={r.key}
            className="absolute select-none"
            style={r.style}
            animate={r.animate as any}
            transition={r.transition}
            aria-hidden="true"
          >
            <div
              className="relative overflow-hidden rounded-2xl bg-black shadow-[0_22px_60px_rgba(0,0,0,0.65)] ring-1 ring-white/10 backdrop-blur-xl"
              style={{ width: 240, height: 150 }}
            >
              <img
                src={r.card.src}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.14),rgba(255,255,255,0.02)_40%,rgba(255,255,255,0.08))]" />

              {r.card.label && (
                <div className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white/80 ring-1 ring-white/10">
                  {r.card.label}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Foreground copy */}
      <div className="relative z-10 flex h-full items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            {title}
          </h1>
          <p className="mt-4 text-white/70 md:text-lg">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/80" />
    </section>
  )
}
