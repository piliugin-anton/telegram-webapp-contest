# Telegram WebApp contest submission

## Draw pictures, make drawing GIF animations/cartoons or drawing videos!

![GIF example](https://github.com/piliugin-anton/telegram-webapp-contest/blob/master/example.gif?raw=true)

### Requirements

Node.js v18+

### Installation

1. Clone repository, navigate to a project folder
2. Run `npm install`
3. Rename `.env.example` file to `.env` and modify variables in this file.

#### .env Variables

- **BOT_TOKEN** - Token you get from @botfather *(required)*
- **BOT_DOMAIN** - Your webhook domain name (example: somedomain.com) *(required in **production** mode)*
- **BOT_PORT** - Bot webhook port (currently supported ports: 443, 80, 88, 8443)
- **BOT_CERTIFICATE** - SSL certificate. Possible values are: 'self-signed' or path to certificate .pem file *(required if you set **BOT_DOMAIN** variable)*
- **SERVER_PORT** - Your server (Front-end and back-end) port number *(required)*
- **VITE_WEBAPP_URL** - URL to your WebApp server *(required)*  

### Development mode

Run ```npm run dev```  


### Production mode (uses [PM2](https://pm2.keymetrics.io/), watch [ecosystem.config.js](./ecosystem.config.js) file)

#### There are 2 options for deployment: run directly using npm scripts from package.json or using a Docker

##### 1. If you want to run it on VPS/dedicated server directly:

1. Install PM2 globally ```npm install -g pm2```
2. Obtain an SSL-certificate (get free from Let's Encrypt, generate self-signed or buy one). Instruction on how to generate self-signed certificate: https://core.telegram.org/bots/self-signed   

**Note: When using Docker, self-signed certificate will be generated automatically for you**  

3. Start server and bot: ```npm run start```

If you want to stop server and bot: ```npm run stop```

Other scripts:  

 - ```npm run reload``` - PM2 reload ecosystem.config.js applications

 - ```npm run restart``` - PM2 restart ecosystem.config.js applications

 - ```npm run delete``` - PM2 delete ecosystem.config.js applications

 - ```npm run logs``` - PM2 logs

 - ```npm run list``` - PM2 process list

 - ```npm run monitor``` - PM2 live monitor

##### 2. Docker

If you want to use it in a Docker container ([Docker](https://www.docker.com) has to be already installed), use scripts from `package.json` prefixed with `docker:`

 - ```npm run docker:up``` - Build and start docker container

 - ```npm run docker:down``` - Stop and remove docker container

 - ```npm run docker:log``` - Docker container logs

 - ```npm run docker:bash``` - Docker bash (shell)

 - ```npm run docker:start``` - PM2 start ecosystem.config.js applications

 - ```npm run docker:stop``` - PM2 stop ecosystem.config.js applications

 - ```npm run docker:reload``` - PM2 reload ecosystem.config.js applications

 - ```npm run docker:restart``` - PM2 restart ecosystem.config.js applications

 - ```npm run docker:delete``` - PM2 delete ecosystem.config.js applications

 - ```npm run docker:logs``` - PM2 logs

 - ```npm run docker:list``` - PM2 process list

 - ```npm run docker:monitor``` - PM2 live monitor

 - ```npm run docker:config``` - Docker config  


### FAQ

> How do I run it locally (without domain name and SSL certificate)?  

You can use a tunneling software like [Telebit](https://telebit.cloud), [localtunnel](https://github.com/localtunnel/localtunnel), [ngrok](https://ngrok.com) or [any of this](https://github.com/anderspitman/awesome-tunneling#open-source-at-least-with-a-reasonably-permissive-license)

> What are the project dependencies?  

**Front-end** part dependencies: [Vite](https://vitejs.dev/)  
**Back-end** part dependencies: [@napi-rs/canvas](https://www.npmjs.com/package/@napi-rs/canvas), [ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static), [Hyper-Express](https://www.npmjs.com/package/hyper-express) (powered by [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js)), [Telegraf](https://github.com/telegraf/telegraf)

### TODO

- [ ] Drawings scaling
- [ ] Store IPC messages in case of failed delivery (implement a response-request model)
- [ ] Rendering queue?

## License
[MIT](./LICENSE)
