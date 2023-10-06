module.exports = {
  apps: [
    {
      name: 'WebApp Server',
      script: './app/service.js',
      watch: false,
      exec_mode: 'cluster',
      instances: 'max',
      wait_ready: true,
      env: {
        NODE_ENV: 'production'
      }
    },
		{
      name: 'WebApp Bot',
      script: './bot/service.js',
      watch: false,
      exec_mode: 'fork',
      instances: 1,
      wait_ready: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
