/* WebSocket server for LAN sync (basic) */
const WebSocket = require('ws');
const port = 3000;
const wss = new WebSocket.Server({ port }, ()=>console.log('v7 signaller listening', port));
wss.on('connection', ws=>{
  ws.on('message', msg=>{
    // broadcast to others
    wss.clients.forEach(c=>{ if(c!==ws && c.readyState===WebSocket.OPEN) c.send(msg); });
  });
});