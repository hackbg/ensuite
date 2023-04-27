#!/usr/bin/env ensuite-reload

const { readFileSync } = require('fs')
const { join, sep, resolve } = require('path')
const { createServer } = require('http')
const { statSync } = require('fs')

module.exports = Object.assign(main, {
  handle,
  wsHandle,
})

/** Launch the Ensuite development server. */
function main (state, args) {
  // Parse arguments
  const [ port = 1234, index = '/index.pug' ] = args || []
  // Init state
  state = state ?? {}
  // Create HTTP server
  if (!state.server) {
    state.server = state.server || require('http')
      .createServer((req, res)=>require(__filename).handle(req, res))
      .listen(port, ()=>console.info(`Listening on`, port))
  }
  // Create WebSocker server
  if (!state.wsServer) {
    state.wsServer = new (require('ws').WebSocketServer)({ server: state.server })
    state.wsServer.on('listening', ()=>console.info(`WebSocket listening on`, port))
    state.wsServer.on('connection', (ws, req)=>require(__filename).wsHandle(ws, req))
  }
  // Return mutated state
  return state
}

/** Handle a HTTP request. */
async function handle (req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  try {
    const mime = url.pathname.endsWith('.svg') ? 'image/svg+xml' : 'text/html'
    const data = await require('./ensuite-render.cli.cjs').render(url)
    res.writeHead(200, { 'Content-Type': mime, })
    res.end(data)
  } catch (e) {
    console.error(e)
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end(e.stack)
  }
}

/** Handle a WebSocket connection. */
async function wsHandle (socket, req) {
  console.log('Reloader connected')
  socket.send('ready')
  socket.addEventListener('message', message => {
    console.log('Reloader message:', message.data)
  })
}
