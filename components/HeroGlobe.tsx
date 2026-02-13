'use client'

import { useEffect, useState } from 'react'

export default function HeroGlobeRowsFinal() {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    let raf: number
    const animate = () => {
      setRotation(r => r + 0.0025)
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [])

  const rows = 7
  const cardsPerRow = 11

  // Full-bleed sizing
  const viewport =
    typeof window !== 'undefined'
      ? Math.min(window.innerWidth, window.innerHeight)
      : 1000

  const radius = viewport * 0.8

  return (
    <div className="hero">
      {/* CENTER COPY */}
      <div className="centerText">
        <h1>Money, in motion</h1>
        <p>The infrastructure layer for modern finance.</p>
      </div>

      {/* GLOBE */}
      <div className="globe">
        {Array.from({ length: rows }).map((_, rowIndex) => {
          const latitude =
            ((rowIndex / (rows - 1)) - 0.5) * Math.PI * 0.85

          const y = Math.sin(latitude) * radius
          const rowRadius =
            Math.cos(latitude) * radius * 1.35

          const direction = rowIndex % 2 === 0 ? 1 : -1

          return Array.from({ length: cardsPerRow }).map((_, i) => {
            const angle =
              (i / cardsPerRow) * Math.PI * 2 +
              rotation * direction

            const x = Math.cos(angle) * rowRadius
            const z = Math.sin(angle) * rowRadius

            const depth = (z + radius) / (radius * 2)

            const opacity = Math.max(
              0,
              Math.min(1, depth * 1.15)
            )

            const scale = 0.78 + depth * 0.35
            const blur = (1 - depth) * 6

            return (
              <div
                key={`${rowIndex}-${i}`}
                className="card"
                style={{
                  transform: `
                    translate3d(${x}px, ${y}px, ${z}px)
                    scale(${scale})
                  `,
                  opacity,
                  filter: `blur(${blur}px)`,
                }}
              />
            )
          })
        })}
      </div>

      <style jsx>{`
        .hero {
          position: relative;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background:
            radial-gradient(
              circle at center,
              #101010 0%,
              #050505 45%,
              #000 100%
            );
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .centerText {
          position: absolute;
          z-index: 20;
          text-align: center;
          color: white;
          pointer-events: none;
        }

        .centerText h1 {
          font-size: clamp(3rem, 6vw, 4.5rem);
          font-weight: 600;
          letter-spacing: -0.02em;
          margin-bottom: 14px;
        }

        .centerText p {
          font-size: clamp(1rem, 1.5vw, 1.2rem);
          opacity: 0.7;
        }

        .globe {
          position: absolute;
          width: 130%;
          height: 130%;
          top: -15%;
          left: -15%;
          perspective: 1400px;
          transform-style: preserve-3d;
        }

        .card {
          position: absolute;
          top: 50%;
          left: 50%;
          width: clamp(150px, 12vw, 190px);
          height: clamp(95px, 7.5vw, 120px);
          border-radius: 16px;
          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.12),
              rgba(255, 255, 255, 0.02)
            );
          box-shadow:
            0 30px 60px rgba(0, 0, 0, 0.6),
            inset 0 0 0 1px rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          transform-style: preserve-3d;
          transition: opacity 0.25s linear;
        }
      `}</style>
    </div>
  )
}
