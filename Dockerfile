FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy app files
COPY . .

RUN npm ci
RUN npm install pm2 -g

# Build an app bundle
RUN npm run prestart

EXPOSE ${SERVER_PORT}

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
