# Telegram WebApp contest submission

## Draw pictures, make drawing GIF animations/cartoons or drawing videos!

### Installation

```npm install```
or
```yarn install```

Rename `.env.example` file to `.env` and modify variables in this file.

#### .env Variables

- **BOT_TOKEN** - Token you get from @botfather
- **SERVER_PORT** - Your server (Front-end and back-end) port number
- **VITE_WEBAPP_URL** - URL to your WebApp server

### Development mode

```npm run dev```
or
```yarn dev```


### Production mode (uses [PM2](https://pm2.keymetrics.io/), watch ecosystem.config.js file)

```npm run start```
or
```yarn start```

#### Docker

If you want to use it in a Docker container:
```docker build . -t teledraw```
then
```docker run -p 127.0.0.1:5678:5678 -d teledraw```

### Requirements

Node.js v18+

## License
[MIT](./LICENSE)
