'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

function CardsField() {
  const root = useRef<THREE.Group>(null!)
  const { viewport } = useThree()

  const isMobile = viewport.width < 6
  const rows = isMobile ? 4 : 7
  const cardsPerRow = isMobile ? 6 : 11
  const radius = isMobile ? 3.6 : 5.6

  /** Rounded rectangle geometry */
  const cardGeometry = useMemo(() => {
    const w = 1.35
    const h = 0.85
    const r = 0.18

    const shape = new THREE.Shape()
    shape.moveTo(-w / 2 + r, -h / 2)
    shape.lineTo(w / 2 - r, -h / 2)
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
    shape.lineTo(w / 2, h / 2 - r)
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
    shape.lineTo(-w / 2 + r, h / 2)
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
    shape.lineTo(-w / 2, -h / 2 + r)
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)

    return new THREE.ShapeGeometry(shape)
  }, [])

  /** Layout with controlled imperfection */
  const rowsData = useMemo(() => {
    return Array.from({ length: rows }).map((_, rowIndex) => {
      const latitude =
        ((rowIndex + 0.5) / rows - 0.5) * Math.PI * 0.65

      const y = Math.sin(latitude) * radius
      const rowRadius = Math.cos(latitude) * radius * 1.25

      const speed =
        (0.06 + Math.random() * 0.03) *
        (rowIndex % 2 === 0 ? 1 : -1)

      const cards = Array.from({ length: cardsPerRow }).map((_, i) => {
        const angle = (i / cardsPerRow) * Math.PI * 2
        const x = Math.cos(angle) * rowRadius
        const z = Math.sin(angle) * rowRadius

        return {
          position: [
            x,
            y,
            z + (Math.random() - 0.5) * 0.25,
          ] as [number, number, number],
          angle,
          scale: 0.92 + Math.random() * 0.08, // CLAMPED
        }
      })

      return { speed, cards }
    })
  }, [rows, cardsPerRow, radius])

  /** Animate rows independently */
  useFrame((_, delta) => {
    root.current.children.forEach((row: any, i: any) => {
      row.rotation.y += delta * rowsData[i].speed
    })
  })

  return (
    <group ref={root}>
      {rowsData.map((row, rowIndex) => (
        <group key={rowIndex}>
          {row.cards.map((card, i) => (
            <mesh
              key={i}
              geometry={cardGeometry}
              position={card.position}
              rotation={[0, card.angle, 0]}
              scale={[card.scale, card.scale, 1]}
            >
              <meshPhysicalMaterial
                transparent
                opacity={0.72}
                roughness={0.22}
                metalness={0.05}
                transmission={0.85}
                thickness={0.5}
                clearcoat={0.9}
                clearcoatRoughness={0.25}
                color="#ffffff"
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export default function HeroGlobeThree() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* CENTER COPY */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          textAlign: 'center',
          color: 'white',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'clamp(3rem, 6vw, 4.5rem)',
              letterSpacing: '-0.02em',
              marginBottom: 14,
            }}
          >
            This shouldn't exist.
          </h1>
          <p style={{ opacity: 0.7 }}>
           ... it does now.
          </p>
        </div>
      </div>

      {/* 3D FIELD */}
      <Canvas
        camera={{ position: [0, 0, 9], fov: 45 }}
        style={{
          background:
            'radial-gradient(circle at center, #101010, #000)',
        }}
      >
        <ambientLight intensity={1.05} />
        <directionalLight position={[6, 6, 6]} intensity={0.85} />
        <CardsField />
      </Canvas>
    </div>
  )
}
