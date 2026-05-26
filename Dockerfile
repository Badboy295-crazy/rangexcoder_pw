# Puppeteer ka official ultra-stable image jisme Chrome aur saari libraries pehle se hain
FROM ghcr.io/puppeteer/puppeteer:22.10.0

# Server directory setup
WORKDIR /app

# Dependencies install karna
COPY package.json ./
RUN npm install

# Saara code container me copy karna
COPY . .

# Port expose karna
EXPOSE 3000

# Server start karne ki final command
CMD ["node", "server.js"]