import 'dotenv/config'

import { defineConfig } from 'vite'
import path from 'path'
import ViteForkPlugin from './app/deps/ForkManager/vite-plugin.js'

const isProduction = process.env.NODE_ENV === 'production'

const ROOT_DIRECTORY = path.join(__dirname, 'app', 'web')
const PORT = parseInt(process.env.SERVER_PORT, 10)
const API_PORT = PORT + (isProduction ? 0 : 1)

const plugins = []

if (!isProduction) {
	const botServicePath = path.join(__dirname, 'bot', 'service.js')
	const appServicePath = path.join(__dirname, 'app', 'service.js')

  plugins.push(ViteForkPlugin({
    forks: [
      {
        modulePath: appServicePath,
        waitForReady: true,
        stdout: (data) => console.log(`[${appServicePath} - stdout]`, data.toString()),
        stderr: (data) => console.log(`[${appServicePath} - stderr]`, data.toString()),
        messageTo: [botServicePath], // string or array
        // execArgv: ['--inspect']
      },
      {
        modulePath: botServicePath,
        waitForReady: true,
        stdout: (data) => console.log(`[${botServicePath} - stdout]`, data.toString()),
        stderr: (data) => console.log(`[${botServicePath} - stderr]`, data.toString()),
      }
    ],
    watch: '**/*.js', // glob string or boolean
    watchCWD: __dirname
  }))
}

export default defineConfig({
  base: '/',
  root: ROOT_DIRECTORY,
	publicDir: path.join(ROOT_DIRECTORY, 'public'),
  server: {
    port: PORT,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
      '/result': `http://localhost:${API_PORT}`
    }
  },
  resolve: {
    alias: {
      '~': ROOT_DIRECTORY
    },
  },
  plugins,
  build: {
    target: 'es2015',
    outDir: 'build'
  }
})
