# Playwright's official image bundles a matching Chromium build, so no
# separate `playwright install` step (and no network fetch of a browser
# binary) is needed at build or run time.
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

COPY package.json package-lock.json ./
COPY mock-services/package.json mock-services/package.json
COPY agent/package.json agent/package.json
COPY dashboard/package.json dashboard/package.json
RUN npm ci

COPY . .

ENV MOCK_BASE_URL=http://localhost:4000
ENV NODE_ENV=production

RUN chmod +x start.sh

# Render (and most PaaS) inject PORT at runtime; dashboard binds to it.
EXPOSE 5000

CMD ["./start.sh"]
