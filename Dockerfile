FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

COPY package.json package-lock.json ./
COPY mock-services/package.json mock-services/package.json
COPY agent/package.json agent/package.json
COPY dashboard/package.json dashboard/package.json
RUN npm ci

COPY agent/detector/requirements.txt agent/detector/requirements.txt
RUN apt-get update && apt-get install -y --no-install-recommends python3-pip && rm -rf /var/lib/apt/lists/*
RUN python3 -m pip install --no-cache-dir -r agent/detector/requirements.txt
RUN python3 -m playwright install chromium

COPY . .

ENV MOCK_BASE_URL=http://localhost:4000
ENV NODE_ENV=production

RUN chmod +x start.sh

# Render (and most PaaS) inject PORT at runtime; dashboard binds to it.
EXPOSE 5000

CMD ["./start.sh"]
