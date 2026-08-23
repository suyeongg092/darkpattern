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

# agent/detector 는 Python 이고, 이 이미지에는 Node 용 Playwright 와 그 짝인
# Chromium 만 들어 있다. Playwright 는 버전마다 짝이 되는 Chromium 빌드가 정해져
# 있어서, 파이썬 쪽이 설치하는 최신 Playwright 는 이미지의 Chromium 을 쓰지 못한다.
# 그래서 파이썬 라이브러리와 그에 맞는 Chromium 을 따로 설치한다.
#
# 파이썬 쪽을 이미지와 같은 버전으로 고정하는 방법도 있지만, 그 버전이 요구하는
# greenlet 이 최신 Python 에서 빌드되지 않아 "Python 3.10 이하에서만 설치된다"는
# 조건이 붙는다. 저장소를 받는 사람의 파이썬 버전에 의존하지 않도록 이쪽을 택했다.
COPY agent/detector/requirements.txt agent/detector/requirements.txt
RUN pip install --no-cache-dir -r agent/detector/requirements.txt
RUN python3 -m playwright install chromium

COPY . .

ENV MOCK_BASE_URL=http://localhost:4000
ENV NODE_ENV=production

RUN chmod +x start.sh

# Render (and most PaaS) inject PORT at runtime; dashboard binds to it.
EXPOSE 5000

CMD ["./start.sh"]
