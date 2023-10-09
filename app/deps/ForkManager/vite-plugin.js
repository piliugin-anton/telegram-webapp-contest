import ForkManager from './index.js'

export default function ViteForkPlugin(options = {}) {
  const forkManager = new ForkManager(options)

  return {
    name: 'ViteForkPlugin',
    configureServer(server) {
      forkManager.setRestartHandler(server.restart)
    },
    buildStart() {
      forkManager.readyPromise.then(() => forkManager.spawnAll()).catch(console.log)
    },
    buildEnd() {
      forkManager.gracefulShutdown()
    }
  }
}
