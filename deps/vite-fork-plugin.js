import ForkController from './ForkController'

export default function ViteForkPlugin(options = []) {
  const forkController = new ForkController(options)

  return {
    name: 'ViteForkPlugin',
    buildStart() {
      forkController.spawnAll()
    },
    buildEnd() {
      forkController.gracefulShutdown()
    }
  }
}