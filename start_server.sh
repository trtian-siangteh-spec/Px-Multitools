#!/bin/bash
# Start a simple HTTP server on port 8080 and open browser
PORT=8080
python3 -m http.server $PORT &
PID=$!
sleep 0.8
if which xdg-open > /dev/null; then
  xdg-open http://localhost:$PORT/login.html
elif which open > /dev/null; then
  open http://localhost:$PORT/login.html
else
  echo "Open http://localhost:$PORT/login.html in your browser"
fi
wait $PID
