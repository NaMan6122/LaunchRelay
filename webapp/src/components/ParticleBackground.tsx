import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Variant = 'snow' | 'float' | 'stars'

interface Props {
  variant?: Variant
  color?: string
  count?: number
  speed?: number
  opacity?: number
}

export default function ParticleBackground({ variant = 'float', color = '#3b82f6', count = 80, speed = 0.3, opacity = 0.4 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 30

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10
      sizes[i] = Math.random() * 3 + 1
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const c = new THREE.Color(color)
    const material = new THREE.PointsMaterial({
      color: c,
      size: 0.15,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    const velocities: number[] = []
    for (let i = 0; i < count; i++) {
      velocities.push((Math.random() - 0.5) * speed * 0.02)
    }

    function animate() {
      if (!mountedRef.current) return
      requestAnimationFrame(animate)

      const pos = particles.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < count; i++) {
        if (variant === 'snow') {
          pos[i * 3 + 1] -= speed * 0.02
          pos[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.005
          if (pos[i * 3 + 1] < -30) pos[i * 3 + 1] = 30
        } else if (variant === 'stars') {
          pos[i * 3 + 1] += velocities[i] * 0.3
          pos[i * 3] += velocities[i] * 0.15
          if (pos[i * 3 + 1] > 30 || pos[i * 3 + 1] < -30) velocities[i] *= -1
          if (pos[i * 3] > 40 || pos[i * 3] < -40) velocities[i] *= -1
        } else {
          pos[i * 3 + 1] += Math.sin(Date.now() * 0.0005 + i * 0.5) * 0.003
          pos[i * 3] += Math.cos(Date.now() * 0.0004 + i * 0.3) * 0.003
        }
      }
      particles.geometry.attributes.position.needsUpdate = true
      renderer.render(scene, camera)
    }
    animate()

    function onResize() {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      mountedRef.current = false
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    }
  }, [variant, color, count, speed, opacity])

  return <canvas ref={canvasRef} className="particle-canvas" />
}
