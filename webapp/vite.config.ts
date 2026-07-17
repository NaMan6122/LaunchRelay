import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const sdkDir = path.resolve(__dirname, '../sdk/dist')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'sdk-files',
      configureServer(server) {
        server.middlewares.use('/sdk', (req, res, next) => {
          const file = req.url?.replace(/^\//, '') || ''
          const filePath = path.join(sdkDir, file)
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath)
            const types: Record<string, string> = { '.js': 'application/javascript', '.map': 'application/json' }
            res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.end(fs.readFileSync(filePath))
          } else {
            next()
          }
        })
      },
    },
  ],
  base: process.env.VITE_BASE || '/',
  server: {
    proxy: {
      '/v1': 'http://localhost:8080',
    },
  },
  build: {
    outDir: '../backend/internal/api/static',
    emptyOutDir: true,
    manifest: true,
    sourcemap: true,
  },
})
