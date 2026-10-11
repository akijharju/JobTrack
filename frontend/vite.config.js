import { cwd } from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const config = {
    plugins: [react()],
  }

  // Production files use relative API paths and do not need a proxy target.
  if (command === 'build') {
    return config
  }

  // Read only the development proxy settings from the frontend environment.
  const env = loadEnv(mode, cwd(), 'API_')

  if (!env.API_PROXY_TARGET) {
    throw new Error('Set API_PROXY_TARGET in frontend/.env.')
  }

  return {
    ...config,
    server: {
      port: 5173,
      strictPort: true,

      // Forward API requests while the browser keeps using the same origin.
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET,
        },
      },
    },
  }
})