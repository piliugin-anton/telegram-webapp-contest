import 'dotenv/config'

import { defineConfig } from 'vite'
import path from 'path'
import ViteForkPlugin from './deps/vite-fork-plugin'

const ROOT_DIRECTORY = path.join(__dirname, 'app', 'web')
const isProduction = process.env.NODE_ENV === 'production'
const PORT = parseInt(process.env.SERVER_PORT, 10) + (isProduction ? 0 : 1)

const botServicePath = path.join(__dirname, 'bot', 'service.js')
const appServicePath = path.join(__dirname, 'app', 'service.js')

export default defineConfig({
  root: ROOT_DIRECTORY,
  build: {
    target: 'es2015',
    outDir: 'build'
  },
  server: {
    port: PORT,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${PORT}`,
      '/result': `http://localhost:${PORT}`
    }
  },
  css: {
    preprocessorOptions: {
      scss: { 
        additionalData: `
        @import "./app/web/src/scss/_variables.scss";
        @import "./app/web/src/scss/_mixins.scss";
        ` 
      },
    }
  },
  plugins: [
    !isProduction && ViteForkPlugin([
      // string or object
      {
        modulePath: appServicePath,
        waitForReady: true,
        watch: true,
        stdout: (data) => console.log(`[${appServicePath} - stdout]`, data.toString()),
        stderr: (data) => console.log(`[${appServicePath} - stderr]`, data.toString()),
        messageTo: [botServicePath] // string or array
      },
      {
        modulePath: botServicePath,
        waitForReady: true,
        watch: true,
        stdout: (data) => console.log(`[${botServicePath} - stdout]`, data.toString()),
        stderr: (data) => console.log(`[${botServicePath} - stderr]`, data.toString()),
      }
    ])
  ]
})