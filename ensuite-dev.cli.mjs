#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { join, sep, resolve } from 'node:path'
import { createServer } from 'node:http'
import { statSync } from 'node:fs'
import { load } from 'js-yaml'
import { WebSocketServer } from 'ws'
import { Console } from '@hackbg/logs'

const console = new Console('ensuite-dev')

if (require.main === module) main({}, process.argv.slice(2))
module.exports = Object.assign(main, { handle, wsHandle, })

/** Launch the Ensuite development server. */
async function main (state, args) {
  // Parse arguments
  const [ port = 1234, root = process.cwd(), config = resolve(root, 'ensuite.yml') ] = args || []
  // Init state
  state.root   ||= root
  state.port   ||= port
  state.config ||= load(readFileSync(config, 'utf8'))
  // Create HTTP server
  state.server ||= createServer((req, res)=>handle(state, req, res))
    .listen(port, ()=>console.info(`Listening on`, port))
  // Create WebSocket server
  state.wsServer ||= new WebSocketServer({ server: state.server })
    state.wsServer.on('listening', ()=>console.info(`WebSocket listening on`, port))
    state.wsServer.on('connection', (ws, req)=>wsHandle(ws, req))
  // Return mutated state
  return state
}

/** Handle a HTTP request. */
async function handle (state, req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  console.log(req.method, url.pathname)
  for (const { path, page } of state.config.routes) {
    if (url.pathname === path) {
      console.log('Matched', page)
      url.pathname = page
    }
  }
  try {
    const { renderUrl } = await import('./ensuite-render.cli.mjs')
    const data = await renderUrl(state, url)
    const mime =
      url.pathname.endsWith('.svg') ? 'image/svg+xml' :
      url.pathname.endsWith('.mjs') ? 'text/javascript' :
      'text/html'
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
