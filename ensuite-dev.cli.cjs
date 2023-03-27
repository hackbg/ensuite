#!/usr/bin/env ensuite-reload

const { join, sep, resolve } = require('path')
const { createServer } = require('http')
const { statSync } = require('fs')

const markdownIt = require('markdown-it')
const markdownItAnchor = require('markdown-it-anchor').default
const markdownItToc = require('markdown-it-table-of-contents')
const highlightJs = require('highlight.js')

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
  return page([
  ], [
    await navigation(),
    `<script type="text/javascript">`,
    `  const ensuiteSocket = new WebSocket(Object.assign(new URL(location.href), { protocol: 'ws' }).href)`,
    `  ensuiteSocket.addEventListener('message', message => {`,
    `    switch (message.data) {`,
    `      case 'ready':  console.info('Reloader ready'); ensuiteSocket.send('ready'); break;`,
    `      case 'reload': console.info('Reloading'); break;`,
    `    }`,
    `  })`,
    `</script>`
  ])
}

async function page (head = [], body = []) {
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    `<meta http-equiv="Content-Security-Policy" content="default-src 'self' ws: 'unsafe-inline';">`,
    ...head,
    '</head>',
    '<body>', ...body, '</body>',
    '</html>'
  ].join('\n')
}

async function navigation () {

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

  // Return the rendered tree
  return [
    '<style id="ensuite.css">',
    require('fs').readFileSync(resolve(__dirname, 'ensuite.css'), 'utf8'),
    '</style>',
    checkboxHack('toggle-file-tree', '', renderTree(tree))
  ].join('\n')

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
    output += `<li><a target="content" href="${path}">${name}</a></li>`
  }
  // Render branches
  for (const name of Object.keys(tree).filter(x=>Object.keys(tree[x]).length > 0).sort()) {
    const path = `${prev}/${name}`
    output += `<li>${checkboxHack(path, name, renderTree(tree[name], prev+'/'+name))}</li>`
  }
  return `<ul>${output}</ul>`
}

//module.exports = (app = {}) => {

  /** If server does not exist and port is provided,
    * create server to respond with handler on port. */
  //const handle = (req, res)=>app.handle(req, res)
  //const ready  = () => console.log(`Listening on ${app.port}`)
  //app.server = app.server ?? (app.port
    //? createServer(handle).listen(app.port, ready)
    //: null)

  /** Handle HTTP requests by trying to render corresponding page.
    * Respond with 200 + body on success, 500 + error stack on failure. */
  //app.handle = async (req, res) => {
    //try {
      //const data = await app.render(req)
      //res.writeHead(200, { 'Content-Type': 'text/html' })
      //res.end(data)
    //} catch (e) {
      //res.writeHead(500, { 'Content-Type': 'text/plain' })
      //res.end(e.stack)
    //}
  //}

  //app.render = async (req) => {
    //const url = new URL(req.url, 'http://null')
    //if (url.pathname === '/_/') {
      //let page = url.searchParams.get('page')
      //if (page === '/') page = '/index.pug'
      //console.log('Rendering page', page)
      //return app.renderPageContent(page)
    //} else {
      //console.log('Rendering', url.pathname)
      //return await app.renderPageWrapper(url)
    //}
  //}

  //app.renderPageWrapper = async url => [
    //`<!doctype html>`,
    //`<html>`,
    //`<head>`,
    //`<style>`,
    //app.style,
    //`</style>`,
    //`</head>`,
    //`<body>`,
    //await app.renderFileTree(),
    //`<iframe name="content" src="/_/?page=${encodeURIComponent(url.pathname)}"></iframe>`,
    //`<script>${app.navigationScript}</script>`,
    //`</body>`,
    //`</html>`
  //].join('\n')

  //app.renderPageContent = page => {
    //if (page.endsWith('.pug')) {
      //console.log('Rendering Pug template:', page)
      //const render = app.watchRequire('./ensuite-render.cli.cjs')
      //return render()
    //}
    //if (page.endsWith('.md')) {
      //console.log('Rendering Markdown page:', page)
      //const data = app.watchRead(join(process.cwd(), page))
      //return [
        //`<style type="text/css">`,
        //app.style,
        //app.contentStyle,
        //`</style>`,
        //`<content>`,
        //app.markdown.render(`[[toc]]\n\n${data}`),
        //`</content>`,
      //].join('\n')
    //}
    //throw new Error(`Unknown page format: ${page}`)
  //}

  //app.renderPug = path => {
  //}

  //app.renderMarkdown = path => {}

  //app.markdown = (()=>{
    //const md = markdownIt({ highlight })
    //md.use(markdownItAnchor)
    //md.use(markdownItToc, { includeLevel: [2,3,4] })
    //return md
    //function highlight (str, lang) {
      //if (lang && highlightJs.getLanguage(lang)) {
        //try {
          //return highlightJs.highlight(str, { language: lang }).value;
        //} catch (_) {}
      //}
      //return ''
    //}
  //})()

  //app.renderFileTree = async () => {
    //const paths = [...new Set([
      //...(await glob('**/*.md')),
      //...(await glob('**/*.ts.md')),
      //...(await glob('**/*.pug'))
    //])]
      //.sort()
      //.map(path=>path.split(sep))
      //.sort((a,b)=>a.length-b.length)
    //// Convert list of paths into tree
    //const tree = {}
    //for (const path of paths) {
      //let dir = tree
      //for (const fragment of path) {
        //dir = (dir[fragment] ??= {})
      //}
    //}
    //// Return the rendered tree
    //return app.checkboxHack('toggle-file-tree', '', app.renderTree(tree))
  //}

  //app.renderTree = (tree, prev = '') => {
    //let output = ''

    //for (const name of Object.keys(tree).filter(x=>Object.keys(tree[x]).length === 0).sort()) {
      //const path = `${prev}/${name}`
      //output += `<li><a target="content" href="${path}">${name}</a></li>`
    //}

    //for (const name of Object.keys(tree).filter(x=>Object.keys(tree[x]).length > 0).sort()) {
      //const path = `${prev}/${name}`
      //output += `<li>${app.checkboxHack(path, name, app.renderTree(tree[name], prev+'/'+name))}</li>`
    //}

    //return `<ul>${output}</ul>`
  //}

  //app.style = app.watchRead(resolve(__dirname, 'ensuite.css'))

  //app.contentStyle = `
    //ul { list-style: initial; margin-bottom: 1rem }
    //li { margin-bottom: 0.5rem; margin-left: 1rem }
    //h1,h2,h3,h4,h5,h6 { margin-top: 2em }
  //`

  //app.navigationScript =
    //app.watchRead(require('path').resolve(__dirname, 'ensuite-nav.js'))

  //app.checkboxHack = (id, text, control) => {
    //const label = `<label for="${id}" class="toggle">${text}</label>`
    //const input = `<input type="checkbox" class="toggle" id="${id}">`
    //return `${input}${label}${control}`
  //}

  //return app

//}
