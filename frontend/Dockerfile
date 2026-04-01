FROM node:20-alpine

WORKDIR /app

# Install deps first (layer cache)
COPY package.json package-lock.json* ./
RUN npm install

# Source copied in dev via volume mount
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
