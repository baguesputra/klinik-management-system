FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate

RUN chmod +x scripts/start.sh

EXPOSE ${PORT}

CMD ["sh", "scripts/start.sh"]