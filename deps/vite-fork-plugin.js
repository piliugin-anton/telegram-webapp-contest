import ForkController from './ForkController'

export default function ViteForkPlugin(options = {}) {
  const forkController = new ForkController(options)

  return {
    name: 'ViteForkPlugin',
    configureServer(server) {
      forkController.setRestartHandler(server.restart)
    },
    buildStart() {
      forkController.readyPromise.then(() => forkController.spawnAll()).catch(console.log)
    },
    buildEnd() {
      forkController.gracefulShutdown()
    }
  }
}
