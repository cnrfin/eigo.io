import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileApi } from './server/fileApi'

const studioDir = path.dirname(fileURLToPath(import.meta.url))

// Run from the eigo-web root with: npm run studio
export default defineConfig(({ mode }) => {
  // studio/.env.local — EIGO_PUBLISH_URL, EIGO_PUBLISH_KEY (server-side only)
  const env = loadEnv(mode, studioDir, 'EIGO_')
  return {
    root: studioDir,
    envDir: studioDir,
    plugins: [
      react(),
      fileApi({
        dataDir: path.join(studioDir, 'data'),
        publishUrl: env.EIGO_PUBLISH_URL,
        publishKey: env.EIGO_PUBLISH_KEY,
      }),
    ],
    resolve: {
      alias: { '@slides': path.resolve(studioDir, '../src/lib/slides') },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: 5180,
      host: '127.0.0.1',
      open: true,
      // Don't reload the app every time a draft is saved to disk.
      watch: { ignored: ['**/studio/data/**'] },
      fs: { allow: [path.resolve(studioDir, '..')] },
    },
    build: { outDir: path.join(studioDir, 'dist'), emptyOutDir: true },
  }
})
