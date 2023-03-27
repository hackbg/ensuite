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
  try {
    const data = await require(__filename).render(req)
    res.writeHead(200, {
      'Content-Type': 'text/html',
      //'Content-Security-Policy': csp,
    })
    res.end(data)
  } catch (e) {
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

async function render (req) {
  let {pathname, searchParams} = new URL(req.url, `http://${req.headers.host}`)
  if (pathname === '/_') pathname = '/_/'
  console.log('Rendering:', pathname)
  if (pathname === '/_/') {
    return await renderContent(searchParams.get('page'))
  }
  return page([
    ...reloader(),
    ...await navigation(),
    `<iframe name="content" src="/_/?page=${req.url}">`
  ])
}

async function renderContent (path) {
  if (path === '/') path = 'index.pug'
  if (path.endsWith('.pug')) {
    return await renderPug(path)
  } else if (path.endsWith('.md')) {
    return await renderMd(path)
  } else {
    throw new Error(`Can't render: ${path}`)
  }
}

async function renderPug (path) {
  console.info('Rendering Pug:', path)
  return require('./ensuite-pug.cli.cjs')()
}

async function renderMd (path) {
  console.info('Rendering Markdown:', path)
  const data = readFileSync(join(process.cwd(), path))
  const {styles = []} = require('js-yaml').load(readFileSync('ensuite.yml', 'utf8'))
  return page([
    ...styles.map(path=>style(path)),
    style('ensuite.css', __dirname),
    '<content>',
    require('./ensuite-markdown').render(`[[toc]]\n\n${data}`),
    '</content>',
  ])
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

function style (style, path = process.cwd()) {
  const file = resolve(path, style)
  const data = readFileSync(file, 'utf8')
  return `<style type="text/css" data-path="${style}">${data}</style>`
}

function reloader () {
  return [
    `<script type="text/javascript">`,
    `  const ensuiteSocket = new WebSocket(Object.assign(new URL(location.href), { protocol: 'ws' }).href)`,
    `  ensuiteSocket.addEventListener('message', message => {`,
    `    switch (message.data) {`,
    `      case 'ready':  console.info('Reloader ready'); ensuiteSocket.send('ready'); break;`,
    `      case 'reload': console.info('Reloading'); break;`,
    `    }`,
    `  })`,
    `</script>`
  ]
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
  const input = `<input type="checkbox" class="toggle" id="${id}">`
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
