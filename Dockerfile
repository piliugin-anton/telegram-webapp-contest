FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy app files
COPY . .

RUN npm ci
RUN npm install pm2 -g

# Build an app bundle
RUN npm run prestart

RUN openssl req \
		-newkey rsa:2048 \
		-sha256 \
		-nodes \
		-keyout /usr/src/app/bot/self-signed.key \
		-x509 \
		-days 365 \
		-out /usr/src/app/bot/self-signed.pem \
		-subj "/C=US/ST=New York/L=Brooklyn/O=TelegramDraw/CN=${BOT_DOMAIN}"

EXPOSE ${SERVER_PORT}

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
