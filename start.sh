#!/bin/sh
# mock-services stays internal to the container (dashboard talks to it over
# localhost); dashboard is the only process that needs to bind the public
# PORT, so it's execed last to receive container signals directly.
set -e

node mock-services/src/server.js &

for i in 1 2 3 4 5 6 7 8 9 10; do
  if wget -q -O /dev/null "http://localhost:${MOCK_PORT:-4000}/"; then
    break
  fi
  sleep 0.5
done

exec node dashboard/src/server.js
