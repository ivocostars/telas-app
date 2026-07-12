FROM node:20
WORKDIR /app
COPY backend/ .
RUN npm install && npx tsc
EXPOSE 4000
CMD ["node", "dist/index.js"]
