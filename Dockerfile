# Playwright 공식 이미지는 Node 용 Playwright 와 그 짝인 Chromium 을 함께 담고 있어서
# agent(Node) 쪽은 별도의 `playwright install` 이 필요 없다. detector(Python) 는
# 아래에서 자기 몫을 따로 설치한다.
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

COPY package.json package-lock.json ./
COPY mock-services/package.json mock-services/package.json
COPY agent/package.json agent/package.json
COPY dashboard/package.json dashboard/package.json
RUN npm ci

# 이 이미지는 Node 용이라 python3 는 있어도 pip 은 없다(빌드 로그 exit code 127 로 확인).
# 그래서 pip 을 먼저 설치하고, 명령 이름 대신 python3 -m pip 으로 부른다 — 실행되는
# 파이썬에 정확히 설치되도록 하기 위해서다.
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
