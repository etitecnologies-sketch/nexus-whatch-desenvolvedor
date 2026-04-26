FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src

RUN npm run build

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]

