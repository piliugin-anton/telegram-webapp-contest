const { fork, exec } = require('child_process')
const chokidar = require('chokidar')

module.exports = class ForkController {
  static SPAWN_STATE = {
    WAITING: -1,
    SPAWNING: 0,
    SPAWNED: 1,
    KILLING: 2,
    KILLED: 3
  }

  forks = {}
  spawnState = ForkController.SPAWN_STATE.WAITING
  watcher = null

  constructor(options = []) {
    this.addForks(options)
  }

  addForks(options) {
    if (this.spawnState !== ForkController.SPAWN_STATE.WAITING) return

    for (let i = 0; i < options.length; i++) {
      const {
        modulePath = options[i],
        execArgv = [],
        parameters = [],
        stdio = ['pipe', 'pipe', 'pipe', 'ipc'],
        detached = false,
        stdout = false,
        stderr = false,
        messageTo = null,
        waitForReady = false,
        watch = false
      } = options[i]

      if (this.forks[modulePath]) continue

      this.forks[modulePath] = {
        process: null,
        state: ForkController.SPAWN_STATE.WAITING,
        waitForReady,
        stdout,
        stderr,
        options: {
          stdio,
          execArgv,
          detached,
        },
        parameters,
        messageTo,
        watch
      }
    }
  }

  processLineSplit(line, limit = 4) {
    const matches = line.match(/\S+/g)
    
    return [...matches.slice(0, limit), matches.slice(limit).join(' ')]
  }

  findProcess(processName) {
    return new Promise((resolve, reject) => {
      const cmd = process.platform === 'win32' ? 'wmic PROCESS GET ParentProcessId,ProcessId,Name,Status,CommandLine' : 'ps -e -o ppid,pid,comm,stat,cmd'

      exec(cmd, (error, stdout, stderr) => {
        if (error) reject(error)

        const [rawHeader, ...lines] = stdout.trim().split('\n').map((line) => line.trim().replace(/\s+/g, ' '))

        const header = rawHeader.split(/\s/g).map(this.normalizeProcessHeader)
        const processList = lines.map((line) => Object.fromEntries(this.processLineSplit(line, header.length - 1).map((value, index) => {
          const propName = header[index]

          value = value.trim()
          if (propName === 'PPID' || propName === 'PID') {
            value = parseInt(value, 10)
          }

          return [propName, value]
        })))
        
        const filtered = processList.filter((proc) => proc.COMMAND.toLowerCase().indexOf(processName.toLowerCase()) > -1)

        resolve(filtered)
      })
    })
  }

  normalizeProcessHeader(str) {
    switch (str) {
      case 'Name':  // for win32
      case 'COMM':  // for darwin
        return 'COMMAND'
        break
      case 'ParentProcessId':
        return 'PPID'
        break
      case 'ProcessId':
        return 'PID'
        break
      case 'Status':
        return 'STAT'
        break
      case 'CommandLine':
        return 'CMD'
        break
      default:
        return str
    }
  }

  async findModuleProcess(modulePath) {
    const nodeProcesses = await this.findProcess('node')

    return nodeProcesses.filter((proc) => proc.CMD.toLowerCase().indexOf(modulePath.toLowerCase()) > -1 && proc.PPID === process.pid)
  }

  spawn(modulePath) {
    return new Promise(async (resolve, reject) => {
      const moduleProcesses = await this.findModuleProcess(modulePath)
      if (moduleProcesses.length) {
        //console.log(moduleProcesses)
        console.log(`${modulePath} is already running with PID(s) ${moduleProcesses.map((proc) => proc.PID).join(', ')}`)

        return resolve()
      }

      let resolved = false

      this.forks[modulePath].state = ForkController.SPAWN_STATE.SPAWNING
      this.forks[modulePath].process = fork(modulePath, this.forks[modulePath].parameters, this.forks[modulePath].options)
  
      if (this.forks[modulePath].messageTo) {
        const emitTo = typeof this.forks[modulePath].messageTo === 'string' ? [this.forks[modulePath].messageTo] : this.forks[modulePath].messageTo
        const receivers = emitTo.reduce((acc, cur) => {
          if (this.forks[cur]) acc.push(this.forks[cur])
  
          return acc
        }, [])
  
        this.forks[modulePath].process.on('message', (message) => receivers.forEach((receiver) => receiver.process.send(message)))
      }

      if (typeof this.forks[modulePath].stdout === 'function') {
        this.forks[modulePath].process.stdout.on('data', this.forks[modulePath].stdout)
      }
  
      if (typeof this.forks[modulePath].stderr === 'function') {
        this.forks[modulePath].process.stderr.on('data', this.forks[modulePath].stderr)
      }

      const readyEventName = this.forks[modulePath].waitForReady ? 'ready' : 'spawn'
      this.forks[modulePath].process.once(readyEventName, () => {
        this.forks[modulePath].state = ForkController.SPAWN_STATE.SPAWNED
        resolved = true
  
        resolve(resolved)
      })
  
      this.forks[modulePath].process.once('error', (error) => {
        if (!resolved) {
          reject(error)
        }
      })

      this.forks[modulePath].process.on('close', async () => {
        this.forks[modulePath].state = ForkController.SPAWN_STATE.KILLED

        if (this.spawnState !== ForkController.SPAWN_STATE.KILLING) await this.respawn(modulePath)
      })
    })
  }

  respawn(modulePath) {
    if (this.forks[modulePath].state !== ForkController.SPAWN_STATE.KILLED) return

    this.forks[modulePath].process = null

    return this.spawn(modulePath)
  }

  spawnAll() {
    if (this.spawnState !== ForkController.SPAWN_STATE.WAITING) return

    this.spawnState = ForkController.SPAWN_STATE.SPAWNING

    const events = [
      'exit',
      'SIGINT',
      'SIGUSR1',
      'SIGUSR2',
      'uncaughtException',
      'SIGTERM'
    ]

    events.forEach((eventType) => process.once(eventType, this.gracefulShutdown.bind(this)))
  
    const promises = []
    const watchPaths = []
    for (const modulePath in this.forks) {
      if (watchPaths.indexOf(modulePath) === -1) {
        watchPaths.push(modulePath)
      }

      const promise = this.spawn(modulePath)

      promises.push(promise)
    }

    if (watchPaths.length) {
      this.watcher = chokidar.watch(watchPaths).on('change', this.handleModuleChange.bind(this))
    }
  
    return Promise.all(promises).then((forks) => {
      this.spawnState = ForkController.SPAWN_STATE.SPAWNED
    })
  }

  gracefulShutdown() {
    for (const modulePath in this.forks) {
      this.kill(this.forks[modulePath])
    }

    if (this.watcher) {
      this.watcher.close()
    }

    this.spawnState = ForkController.SPAWN_STATE.WAITING
  }

  kill(fork) {
    fork.state = ForkController.SPAWN_STATE.KILLING

    if (fork.process) {
      process.kill(fork.process.pid, 'SIGTERM')
    }
  }

  handleModuleChange(modulePath) {
    console.log(`${modulePath} changed, restarting...`)

    this.kill(this.forks[modulePath])
  }
}