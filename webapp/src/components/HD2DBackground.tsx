import { useRef, useEffect } from 'react'
import * as THREE from 'three'

interface LayerNode {
  pos: THREE.Vector3
  vel: THREE.Vector3
  phase: number
}

interface ParticleLayer {
  nodes: LayerNode[]
  positions: Float32Array
  colors: Float32Array
  geom: THREE.BufferGeometry
  points: THREE.Points
  material: THREE.PointsMaterial
  edgePositions: Float32Array
  edgeColors: Float32Array
  edgeGeom: THREE.BufferGeometry
  edgeLines: THREE.LineSegments
  edgeMat: THREE.LineBasicMaterial
  config: LayerConfig
}

interface LayerConfig {
  count: number
  spread: number
  baseZ: number
  connectDist: number
  speed: number
  size: number
  opacity: number
  palette: THREE.Color[]
  boundX: number
  boundY: number
  boundZ: number
}

function createLayer(config: LayerConfig, scene: THREE.Scene): ParticleLayer {
  const { count, spread, baseZ, connectDist, speed, size, opacity, palette } = config

  const nodes: LayerNode[] = []
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const n: LayerNode = {
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.7,
        baseZ + (Math.random() - 0.5) * spread * 0.4,
      ),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.012 * speed,
        (Math.random() - 0.5) * 0.012 * speed,
        (Math.random() - 0.5) * 0.006 * speed,
      ),
      phase: Math.random() * Math.PI * 2,
    }
    nodes.push(n)

    positions[i * 3] = n.pos.x
    positions[i * 3 + 1] = n.pos.y
    positions[i * 3 + 2] = n.pos.z

    const c = palette[Math.floor(Math.random() * palette.length)]
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geom, material)
  scene.add(points)

  const maxEdges = count * 6
  const edgePositions = new Float32Array(maxEdges * 6)
  const edgeColors = new Float32Array(maxEdges * 6)
  const edgeGeom = new THREE.BufferGeometry()
  edgeGeom.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3))
  edgeGeom.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3))
  edgeGeom.setDrawRange(0, 0)

  const edgeMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: opacity * 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const edgeLines = new THREE.LineSegments(edgeGeom, edgeMat)
  scene.add(edgeLines)

  function updateEdges() {
    const pos = points.geometry.attributes.position.array as Float32Array
    const col = points.geometry.attributes.color.array as Float32Array
    let idx = 0

    for (let i = 0; i < count && idx < maxEdges; i++) {
      for (let j = i + 1; j < count && idx < maxEdges; j++) {
        const dx = pos[i * 3] - pos[j * 3]
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < connectDist) {
          const alpha = 1 - dist / connectDist

          edgePositions[idx * 6] = pos[i * 3]
          edgePositions[idx * 6 + 1] = pos[i * 3 + 1]
          edgePositions[idx * 6 + 2] = pos[i * 3 + 2]
          edgePositions[idx * 6 + 3] = pos[j * 3]
          edgePositions[idx * 6 + 4] = pos[j * 3 + 1]
          edgePositions[idx * 6 + 5] = pos[j * 3 + 2]

          edgeColors[idx * 6] = col[i * 3] * alpha
          edgeColors[idx * 6 + 1] = col[i * 3 + 1] * alpha
          edgeColors[idx * 6 + 2] = col[i * 3 + 2] * alpha
          edgeColors[idx * 6 + 3] = col[j * 3] * alpha
          edgeColors[idx * 6 + 4] = col[j * 3 + 1] * alpha
          edgeColors[idx * 6 + 5] = col[j * 3 + 2] * alpha

          idx++
        }
      }
    }

    edgeGeom.attributes.position.needsUpdate = true
    edgeGeom.attributes.color.needsUpdate = true
    edgeGeom.setDrawRange(0, idx * 2)
  }

  updateEdges()

  return { nodes, positions, colors, geom, points, material, edgePositions, edgeColors, edgeGeom, edgeLines, edgeMat, config }
}

export default function HD2DBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200)
    camera.position.set(0, 0, 55)

    // Layer configs: [count, spread, baseZ, connectDist, speed, size, opacity, palette]
    const layers = [
      createLayer({
        count: 60, spread: 55, baseZ: -25, connectDist: 10,
        speed: 0.4, size: 0.18, opacity: 0.3,
        palette: [new THREE.Color('#1e40af'), new THREE.Color('#3b82f6'), new THREE.Color('#60a5fa')],
        boundX: 30, boundY: 22, boundZ: 8,
      }, scene),
      createLayer({
        count: 80, spread: 45, baseZ: 0, connectDist: 13,
        speed: 1.0, size: 0.32, opacity: 0.6,
        palette: [new THREE.Color('#3b82f6'), new THREE.Color('#22d3ee'), new THREE.Color('#8b5cf6'), new THREE.Color('#a78bfa')],
        boundX: 24, boundY: 18, boundZ: 6,
      }, scene),
      createLayer({
        count: 45, spread: 35, baseZ: 20, connectDist: 16,
        speed: 1.8, size: 0.50, opacity: 0.8,
        palette: [new THREE.Color('#a78bfa'), new THREE.Color('#22d3ee'), new THREE.Color('#34d399'), new THREE.Color('#f59e0b')],
        boundX: 20, boundY: 15, boundZ: 5,
      }, scene),
    ]

    let start = Date.now()

    function animate() {
      const t = (Date.now() - start) * 0.001

      for (const layer of layers) {
        const pos = layer.points.geometry.attributes.position.array as Float32Array

        for (let i = 0; i < layer.config.count; i++) {
          const n = layer.nodes[i]
          const phase = n.phase + t * 0.15 * layer.config.speed
          const s = layer.config.speed

          n.pos.x += Math.sin(phase * 0.5) * 0.004 * s + n.vel.x
          n.pos.y += Math.cos(phase * 0.3) * 0.004 * s + n.vel.y
          n.pos.z += Math.sin(phase * 0.4) * 0.003 * s + n.vel.z

          if (Math.abs(n.pos.x) > layer.config.boundX) n.vel.x *= -0.5
          if (Math.abs(n.pos.y) > layer.config.boundY) n.vel.y *= -0.5
          if (Math.abs(n.pos.z - layer.config.baseZ) > layer.config.boundZ) n.vel.z *= -0.5

          pos[i * 3] = n.pos.x
          pos[i * 3 + 1] = n.pos.y
          pos[i * 3 + 2] = n.pos.z
        }

        layer.points.geometry.attributes.position.needsUpdate = true

        // Per-layer edge update — nodes only connect within their own layer
        const cpos = layer.points.geometry.attributes.position.array as Float32Array
        const ccol = layer.points.geometry.attributes.color.array as Float32Array
        let idx = 0
        const maxEdges = layer.config.count * 6
        const cd = layer.config.connectDist

        for (let i = 0; i < layer.config.count && idx < maxEdges; i++) {
          for (let j = i + 1; j < layer.config.count && idx < maxEdges; j++) {
            const dx = cpos[i * 3] - cpos[j * 3]
            const dy = cpos[i * 3 + 1] - cpos[j * 3 + 1]
            const dz = cpos[i * 3 + 2] - cpos[j * 3 + 2]
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

            if (dist < cd) {
              const alpha = 1 - dist / cd
              layer.edgePositions[idx * 6] = cpos[i * 3]
              layer.edgePositions[idx * 6 + 1] = cpos[i * 3 + 1]
              layer.edgePositions[idx * 6 + 2] = cpos[i * 3 + 2]
              layer.edgePositions[idx * 6 + 3] = cpos[j * 3]
              layer.edgePositions[idx * 6 + 4] = cpos[j * 3 + 1]
              layer.edgePositions[idx * 6 + 5] = cpos[j * 3 + 2]
              layer.edgeColors[idx * 6] = ccol[i * 3] * alpha
              layer.edgeColors[idx * 6 + 1] = ccol[i * 3 + 1] * alpha
              layer.edgeColors[idx * 6 + 2] = ccol[i * 3 + 2] * alpha
              layer.edgeColors[idx * 6 + 3] = ccol[j * 3] * alpha
              layer.edgeColors[idx * 6 + 4] = ccol[j * 3 + 1] * alpha
              layer.edgeColors[idx * 6 + 5] = ccol[j * 3 + 2] * alpha
              idx++
            }
          }
        }

        layer.edgeGeom.attributes.position.needsUpdate = true
        layer.edgeGeom.attributes.color.needsUpdate = true
        layer.edgeGeom.setDrawRange(0, idx * 2)

        // Gentle rotation per layer at different speeds for parallax effect
        const rotSpeed = [0.004, 0.008, 0.015]
        layer.points.rotation.y = Math.sin(t * rotSpeed[layers.indexOf(layer)]) * 0.12
        layer.edgeLines.rotation.y = layer.points.rotation.y
      }

      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }

    let animId = requestAnimationFrame(animate)

    function onResize() {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="particle-canvas" />
}
