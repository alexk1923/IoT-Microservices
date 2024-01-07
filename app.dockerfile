FROM node:latest

WORKDIR /src

COPY package*.json ./

RUN npm install

COPY src/ ./

ENV PORT=8000

EXPOSE 8000

CMD ["npx", "nodemon", "server.js"]
