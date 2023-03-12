#!/usr/bin/env node

const self = './ensuite-dev.cli.cjs'

if (require.main === module) {
  const [dir = '.', port = 1234] = process.argv.slice(2)
  require('process')
    .chdir(dir)
  require('http')
    .createServer((req, res)=>require(self).handle(req, res))
    .listen(port, () => console.log(`Listening on ${port}`))
  require('fs')
    .watchFile(require.resolve(self), {interval: 100}, (...args)=>require(self).reload(...args))
}

let app = module.exports

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
  const url =  new URL(req.url, 'http://null')
  if (url.pathname === '/') {
    return app.template(
      await app.renderFileTree(),
      `<iframe name="content" src="${url.searchParams.get('page')??''}"></iframe>`,
      `<script>${app.navigationScript}</script>`
    )
  } else {
    return app.template(`<content>`, app.renderFile(url.pathname), '</content>')
  }
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
})

app.renderFile = (url) => {
  const data = require('fs').readFileSync(require('path').join(process.cwd(), url), 'utf8')
  const content = app.markdown().render(`[[toc]]\n\n${data}`)
  return `<style>${app.contentStyle}</style>${content}`
}

app.renderFileTree = async () => {
  const files = (await (require('glob'))('**/*.ts.md')).sort().map(path=>path.split(require('path').sep))
  const tree = {}
  // Convert list of paths into tree
  for (const path of files) {
    let dir = tree
    for (const fragment of path) {
      dir = (dir[fragment] ??= {})
    }
  }
  // Return the rendered tree
  return (function renderTree (tree, prev = '') {
    let output = ''
    for (const name of Object.keys(tree).sort()) {
      if (Object.keys(tree[name]).length === 0) {
        output += `<li><strong><a target="content" href="${prev}/${name}">${name}</a></strong></li>`
      } else {
        output += `<li>${name}${renderTree(tree[name], prev+'/'+name)}</li>`
      }
    }
    return `<ul>${output}</ul>`
  })(tree)
}

app.style = `
html { height: 100% }
body { font-family: sans-serif; margin: 0; padding: 0; display: flex; flex-flow: row nowrap; width: 100%; min-height: 100% }
ul { margin: 0; padding-left: 1rem; list-style: none }
body > ul { background: #eee; padding: 1rem; border-right: 1px solid #fff }
body > ul a { font-weight: bold; color: black }
body > iframe { flex-grow: 1; border: none; border-left: 1px solid #ddd }
content { margin: 0 1rem 0 2rem; max-width: 60rem; padding-bottom: 1rem }
pre { border: 1px solid #888; padding: 0.5rem; background: #ffd; overflow-x: auto }
.hljs-import { font-weight: bold }
.hljs-keyword { font-weight: bold }
.hljs-string { font-style: italic }
.hljs-comment { color: #484; font-weight: bold }
.table-of-contents { float: right; background: #eee; border: 1px solid #888; margin: 1rem 0 1rem 2rem; padding: 1rem 1rem 0 0; font-size: 0.9rem; }
.table-of-contents li > ul { margin-top: 0.5rem }
.table-of-contents > ul > li { font-weight: bold }
.table-of-contents > ul > li > ul > li { font-weight: normal }

th { text-transform: uppercase; font-size: 0.8em; letter-spacing: 1px; background: #333; color: #eee; font-weight: bold; text-align: left; padding: 0.5rem; vertical-align: bottom; }
td { background: #eee; padding: 0.25rem 0.5rem }
`

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
