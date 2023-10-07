FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy app files
COPY . .

# Install dependencies
RUN npm ci
RUN npm install pm2 -g

# Build an app bundle
RUN npm run prestart

# Generate self-signed certificate
RUN openssl req \
		-newkey rsa:2048 \
		-sha256 \
		-nodes \
		-keyout /usr/src/app/bot/self-signed.key \
		-x509 \
		-days 365 \
		-out /usr/src/app/bot/self-signed.pem \
		-subj "/ST=Server town/O=TelegramDraw/CN=${BOT_DOMAIN}"

# Expose ports
EXPOSE ${SERVER_PORT} ${BOT_PORT}

# Run PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
