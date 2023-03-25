#!/usr/bin/env node

let app = module.exports

const {basename} = require('path')
const self = `./${basename(__filename)}`

app.watch = file => {
  console.log('Watch', file)
  const watcher = require('fs').watchFile(
    file,
    {interval: 100},
    (...args)=>require(self).reload(...args)
  )
  return file
}

if (require.main === module) {
  const [dir = '.', port = 1234] = process.argv.slice(2)
  require('process')
    .chdir(dir)
  require('http')
    .createServer((req, res)=>require(self).handle(req, res))
    .listen(port, () => console.log(`Listening on ${port}`))
  app.watch(require.resolve(self))
}

app.reload = (current, previous) => {
  console.log('Reloading')
  const old = require.cache[require.resolve(self)]
  delete require.cache[require.resolve(self)]
  try {
    app = require(self)
  } catch (e) {
    console.warn('Reload failed', e)
    require.cache[require.resolve(self)] = old
  }
}

app.loadWatch = file =>
  require('fs').readFileSync(app.watch(file), 'utf8')

app.handle = async (req, res) => {
  try {
    const data = await app.render(req)
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end(e.stack)
  }
}

app.render = async (req) => {
  const url = new URL(req.url, 'http://null')
  if (url.pathname === '/') {
    const tree = await app.renderFileTree()
    const src = url.searchParams.get('page')??'about:blank'
    const iframe = `<iframe name="content" src="${src}"></iframe>`
    const script = `<script>${app.navigationScript}</script>`
    return app.template(tree, iframe, script)
  }
  return app.template(`<content>`, app.renderFile(url.pathname), '</content>')
}

app.template = (...elements) => [
  '<!doctype html>',
  `<html><head><style>${app.style}</style></head>`,
  `<body>`, ...elements, `</body>`,
  '</html>'
].join('\n')

app.markdown = (()=>{
  const md = require('markdown-it')({ highlight })
  md.use(require('markdown-it-anchor').default)
  md.use(require('markdown-it-table-of-contents'), { includeLevel: [2,3,4] })
  return md
  function highlight (str, lang) {
    if (lang && require('highlight.js').getLanguage(lang)) {
      try {
        return require('highlight.js').highlight(str, { language: lang }).value;
      } catch (_) {}
    }
    return ''
  }
})()

app.renderFile = (url) => {
  const data = app.loadWatch(require('path').join(process.cwd(), url))
  const content = app.markdown.render(`[[toc]]\n\n${data}`)
  return `<style>${app.contentStyle}</style>${content}`
}

app.renderFileTree = async () => {
  const files = [...new Set([
    ...(await (require('glob'))('**/*.md')),
    ...(await (require('glob'))('**/*.ts.md')),
    ...(await (require('glob'))('**/*.pug'))
  ])].sort().map(path=>path.split(require('path').sep))
  const tree = {}
  // Convert list of paths into tree
  for (const path of files) {
    let dir = tree
    for (const fragment of path) {
      dir = (dir[fragment] ??= {})
    }
  }
  // Return the rendered tree
  return checkboxHack('toggle-file-tree', renderTree(tree))
}

function checkboxHack (id, control) {
  const label = `<label for="${id}"></label>`
  const input = `<input type="checkbox" id="${id}">`
  return `${label}${input}${control}`
}

function renderTree (tree, prev = '') {
  let output = ''
  for (const name of Object.keys(tree).sort()) {
    if (Object.keys(tree[name]).length === 0) {
      output += `<li><strong><a target="content" href="${prev}/${name}">${name}</a></strong></li>`
    } else {
      output += `<li>${name}${renderTree(tree[name], prev+'/'+name)}</li>`
    }
  }
  return `<ul>${output}</ul>`
}

app.style = app.loadWatch(require('path').resolve(__dirname, 'ensuite.css'))

//require('fs').readFileSync(require('path').resolve(require.resolve('highlight.js'), '../../styles/github.css'))
app.contentStyle = `
ul { list-style: initial; margin-bottom: 1rem }
li { margin-bottom: 0.5rem; margin-left: 1rem }
h1,h2,h3,h4,h5,h6 { margin-top: 2em }
`

app.navigationScript = `
document.querySelectorAll('a[target=content]').forEach(element=>{
  element.addEventListener('click', () => {
    url = new URL(window.location)
    url.searchParams.set('page', new URL(element.href).pathname)
    console.log(element.href)
    history.pushState({}, '', url)
  })
})
`
