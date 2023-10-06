# Telegram WebApp contest submission

## Draw pictures, make drawing GIF animations/cartoons or drawing videos!

### Requirements

Node.js v18+

### Installation

1. Clone repository, navigate to a project folder
2. Run `npm install`
3. Rename `.env.example` file to `.env` and modify variables in this file.

#### .env Variables

- **BOT_TOKEN** - Token you get from @botfather
- **SERVER_PORT** - Your server (Front-end and back-end) port number
- **VITE_WEBAPP_URL** - URL to your WebApp server

### Development mode

Run ```npm run dev```


### Production mode (uses [PM2](https://pm2.keymetrics.io/), watch [ecosystem.config.js](./ecosystem.config.js) file)

#### If you want to run it on VPS/dedicated server:

1. Install PM2 globally ```npm install -g pm2```
2. Start server and bot: ```npm run start```

If you want to stop server and bot: ```npm run stop```

#### Docker

If you want to use it in a Docker container, use scripts from `package.json` prefixed with `docker:`

```npm run docker:up``` - Build and start docker container

```npm run docker:down``` - Stop docker container

#### FAQ

> How do I run it locally (without domain name and SSL certificate)?

You can use a tunneling software like [localtunnel](https://github.com/localtunnel/localtunnel), [Telebit](https://telebit.cloud), [ngrok](https://ngrok.com) or [any of this](https://github.com/anderspitman/awesome-tunneling#open-source-at-least-with-a-reasonably-permissive-license)

## License
[MIT](./LICENSE)
