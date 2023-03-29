#!/usr/bin/env ensuite-reload

const { readFileSync } = require('fs')
const { join, sep, resolve } = require('path')
const { createServer } = require('http')
const { statSync } = require('fs')

module.exports = Object.assign(main, {
  handle,
  wsHandle,
  render
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
    const data = await require(__filename).render(url)
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

async function render (url) {
  let {pathname, searchParams} = url
  if (pathname === '/') pathname = '/index.pug'
  while (pathname.startsWith('/')) pathname = pathname.slice(1)
  const path = resolve(pathname)
  console.log('Rendering:', pathname, path)
  if (path.endsWith('.pug')) {
    return await injectNavigation(await renderPug(path))
  } else if (path.endsWith('.md')) {
    return await injectNavigation(await renderMd(path))
  } else {
    return readFileSync(path)
  }
}

async function renderPug (path) {
  console.info('Rendering Pug:', path)
  return require('./ensuite-pug.cli.cjs')()
}

async function renderMd (path) {
  console.info('Rendering Markdown:', path)
  const data = readFileSync(path)
  const {styles = []} = require('js-yaml').load(readFileSync('ensuite.yml', 'utf8'))
  return page([
    ...styles.map(path=>style(path, readFileSync(path))),
    '<content class="ensuite-md-rendered">',
    require('./ensuite-md').render(`[[toc]]\n\n${data}`),
    '</content>',
  ])
}

async function injectNavigation (html) {
  return [
    html,
    style('ensuite', readFileSync(resolve(__dirname, 'ensuite-nav.css'), 'utf8')),
    template('ensuite', checkboxHack('toggle-file-tree', '', renderTree(await scopeTree()))),
    script('ensuite', readFileSync(resolve(__dirname, 'ensuite-nav.js'), 'utf8')),
  ].join('\n')
}

function style (name, data) {
  return `<style name="${name}" type="text/css">${data}</style>`
}

function script (name, data) {
  return `<script name="${name}" type="text/javascript">${data}</script>`
}

function template (name, data) {
  return `<template name="${name}">${data}</template>`
}

async function page (body = []) {
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    `<meta charset="utf-8">`,
    `<meta http-equiv="Content-Security-Policy" content="default-src 'self' ws: 'unsafe-inline';">`,
    '</head>',
    '<body>',
    ...body,
    '</body>',
    '</html>'
  ].join('\n')
}

/** Get a tree of in-scope files for the project. */
/** Render the navigation tree. */
async function navigation () {
  return [
    style('ensuite.css', __dirname),
    checkboxHack('toggle-file-tree', '', renderTree(await scopeTree()))
  ]
}

function checkboxHack (id, text, control) {
  const label = `<label for="${id}" class="toggle">${text}</label>`
  const input = `<input type="checkbox" class="ensuite-toggle" id="${id}">`
  return `${input}${label}${control}`
}

function renderTree (tree, prev = '') {
  let output = ''
  // Render leaves first
  for (const name of Object.keys(tree).filter(x=>Object.keys(tree[x]).length === 0).sort()) {
    const path = `${prev}/${name}`
    output += `<li><a href="${path}">${name}</a></li>`
  }
  // Render branches
  for (const name of Object.keys(tree).filter(x=>Object.keys(tree[x]).length > 0).sort()) {
    const path = `${prev}/${name}`
    output += `<li>${checkboxHack(path, name, renderTree(tree[name], prev+'/'+name))}</li>`
  }
  return `<ul>${output}</ul>`
}

async function scopeTree () {
  // Get all files matching filter
  const glob = require('glob')
  const paths = [...new Set([
    ...(await glob('**/*.md')),
    ...(await glob('**/*.ts.md')),
    ...(await glob('**/*.pug'))
  ])]
    .sort()
    .map(path=>path.split(sep))
    .sort((a,b)=>a.length-b.length)
  // Convert list of paths into tree
  const tree = {}
  for (const path of paths) {
    let dir = tree
    for (const fragment of path) {
      dir = (dir[fragment] ??= {})
    }
  }
  return tree
}
