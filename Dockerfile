FROM node:20
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]
