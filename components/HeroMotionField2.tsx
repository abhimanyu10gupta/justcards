'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

/* ---------- DEMO CARD IMAGES ---------- */
/* Replace later with your own designs */
const CARD_IMAGES = [
  'https://i.imgur.com/3ZQ3ZQp.png',
  'https://i.imgur.com/8Km9tLL.png',
  'https://m.media-amazon.com/images/I/617q9vGC6pL.jpg',
  'https://m.media-amazon.com/images/I/61NeGNZi6ZL._AC_UF894,1000_QL80_.jpg',
  'https://cdn.milenio.com/uploads/media/2021/06/03/mclovin-sony-pictures-entertainment.jpg',
  'https://i.pinimg.com/736x/a8/4b/c8/a84bc8f285c87dba0344b9df74302542.jpg',
]

/* ---------- CONFIG ---------- */
const ROWS_DESKTOP = 4
const ROWS_MOBILE = 3

const CARD_WIDTH = 240
const CARD_HEIGHT = 150

const BASE_GAP_DESKTOP = 140
const BASE_GAP_MOBILE = 72

const ROW_GAP = 180
const BASE_DURATION = 46

type RowData = {
  direction: 1 | -1
  duration: number
  y: number
  gap: number
}

export default function HeroMotionField2() {
  const [rows, setRows] = useState<RowData[] | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mobile = window.innerWidth < 768
    setIsMobile(mobile)

    const rowCount = mobile ? ROWS_MOBILE : ROWS_DESKTOP

    const generated: RowData[] = Array.from({ length: rowCount }).map(
      (_, i) => ({
        direction: i % 2 === 0 ? 1 : -1,
        duration: BASE_DURATION + i * 6,
        y: (i - (rowCount - 1) / 2) * ROW_GAP,
        gap:
          (mobile ? BASE_GAP_MOBILE : BASE_GAP_DESKTOP) +
          (Math.random() - 0.5) * 32,
      })
    )

    setRows(generated)
  }, [])

  if (!rows) return null

  return (
    <div className="hero">
      {/* CENTER COPY */}
      <div className="center">
        <h1>Make stupid cards.</h1>
        <h1>Add them to your wallet.</h1>
        <p>
          Memes, fake IDs, club passes — if it fits in a card, it belongs here.
        </p>
      </div>

      {/* MOTION FIELD */}
      <div className="field">
        {rows.map((row, i) => (
          <MotionRow key={i} {...row} isMobile={isMobile} />
        ))}
      </div>

      <style jsx>{`
        .hero {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: radial-gradient(
            circle at center,
            #121212 0%,
            #080808 45%,
            #000 100%
          );
        }

        .center {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          pointer-events: none;
          color: white;
          padding: 0 16px;
        }

        .center h1 {
          font-size: clamp(2.4rem, 5vw, 3.8rem);
          letter-spacing: -0.02em;
          line-height: 1.05;
        }

        .center p {
          margin-top: 18px;
          max-width: 620px;
          opacity: 0.7;
          font-size: 1.05rem;
        }

        .field {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

/* ---------- ROW ---------- */

function MotionRow({
  direction,
  duration,
  y,
  gap,
  isMobile,
}: RowData & { isMobile: boolean }) {
  const cardsPerRow = isMobile ? 4 : 5
  const trackWidth =
    cardsPerRow * (CARD_WIDTH + gap)

  return (
    <motion.div
      className="row"
      style={{ top: '50%', y }}
      animate={{
        x: direction === 1 ? [0, -trackWidth] : [-trackWidth, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <div className="track" style={{ gap }}>
        {Array.from({ length: cardsPerRow * 2 }).map((_, i) => {
          const img = CARD_IMAGES[i % CARD_IMAGES.length]

          const center = cardsPerRow
          const d = (i - center) / center // -1 .. 0 .. +1
          const abs = Math.abs(d)

          return (
            <div
              key={i}
              className="card"
              style={{
                opacity: 1 - abs * 0.55,
                // filter: `blur(${abs * 2}px)`,
                transform: `
                  translateZ(${-abs * 140}px)
                  rotateY(${d * 18}deg)
                  scale(${1 - abs * 0.18})
                `,
              }}
            >
              <img src={img} alt="" />
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .row {
          position: absolute;
          left: 0;
          width: ${trackWidth * 2}px;
          will-change: transform;
          perspective: 1200px;
          transform-style: preserve-3d;
        }

        .track {
          display: flex;
          transform-style: preserve-3d;
        }

        .card {
          width: ${CARD_WIDTH}px;
          height: ${CARD_HEIGHT}px;
          border-radius: 26px;
          overflow: hidden;
          background: #111;
          box-shadow: 0 22px 50px rgba(0, 0, 0, 0.75);
          flex-shrink: 0;
          transform-style: preserve-3d;
        }

        .card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </motion.div>
  )
}
