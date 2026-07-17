import { useRef, useEffect } from 'react'
import * as THREE from 'three'

interface Node3D {
  pos: THREE.Vector3
  vel: THREE.Vector3
  phase: number
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

    const NODE_COUNT = 110
    const CONNECT_DIST = 14
    const SPREAD = 45

    const nodes: Node3D[] = []
    const positions = new Float32Array(NODE_COUNT * 3)
    const colors = new Float32Array(NODE_COUNT * 3)
    const sizes = new Float32Array(NODE_COUNT)

    const palette = [
      new THREE.Color('#3b82f6'),
      new THREE.Color('#60a5fa'),
      new THREE.Color('#22d3ee'),
      new THREE.Color('#8b5cf6'),
      new THREE.Color('#a78bfa'),
      new THREE.Color('#10b981'),
    ]

    for (let i = 0; i < NODE_COUNT; i++) {
      const n: Node3D = {
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * SPREAD,
          (Math.random() - 0.5) * SPREAD * 0.7,
          (Math.random() - 0.5) * SPREAD * 0.5,
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.004,
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

      sizes[i] = 1.5 + Math.random() * 2.5
    }

    const nodeGeom = new THREE.BufferGeometry()
    nodeGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    nodeGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    nodeGeom.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const nodeMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const nodePoints = new THREE.Points(nodeGeom, nodeMat)
    scene.add(nodePoints)

    const maxEdges = NODE_COUNT * 6
    const edgePositions = new Float32Array(maxEdges * 6)
    const edgeColors = new Float32Array(maxEdges * 6)
    const edgeGeom = new THREE.BufferGeometry()
    edgeGeom.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3))
    edgeGeom.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3))
    edgeGeom.setDrawRange(0, 0)

    const edgeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const edgeLines = new THREE.LineSegments(edgeGeom, edgeMat)
    scene.add(edgeLines)

    function updateEdges() {
      const pos = nodePoints.geometry.attributes.position.array as Float32Array
      const col = nodePoints.geometry.attributes.color.array as Float32Array
      let idx = 0

      for (let i = 0; i < NODE_COUNT && idx < maxEdges; i++) {
        for (let j = i + 1; j < NODE_COUNT && idx < maxEdges; j++) {
          const dx = pos[i * 3] - pos[j * 3]
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (dist < CONNECT_DIST) {
            const alpha = 1 - dist / CONNECT_DIST

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

    let start = Date.now()

    function animate() {
      const t = (Date.now() - start) * 0.001
      const pos = nodePoints.geometry.attributes.position.array as Float32Array

      for (let i = 0; i < NODE_COUNT; i++) {
        const n = nodes[i]
        const phase = n.phase + t * 0.15

        n.pos.x += Math.sin(phase * 0.5) * 0.004 + n.vel.x
        n.pos.y += Math.cos(phase * 0.3) * 0.004 + n.vel.y
        n.pos.z += Math.sin(phase * 0.4) * 0.003 + n.vel.z

        const bound = SPREAD * 0.5
        if (Math.abs(n.pos.x) > bound) n.vel.x *= -0.5
        if (Math.abs(n.pos.y) > bound) n.vel.y *= -0.5
        if (Math.abs(n.pos.z) > bound * 0.5) n.vel.z *= -0.5

        pos[i * 3] = n.pos.x
        pos[i * 3 + 1] = n.pos.y
        pos[i * 3 + 2] = n.pos.z
      }
      nodePoints.geometry.attributes.position.needsUpdate = true

      const pulse = 0.7 + Math.sin(t * 0.3) * 0.3
      nodeMat.opacity = pulse * 0.8

      updateEdges()

      const rotY = Math.sin(t * 0.008) * 0.15
      nodePoints.rotation.y = rotY
      edgeLines.rotation.y = rotY

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
