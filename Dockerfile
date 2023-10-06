FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm ci
RUN npm install pm2 -g
RUN npm run prestart

# Bundle app source
COPY . .

EXPOSE 5678

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
