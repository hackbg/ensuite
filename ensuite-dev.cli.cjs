#!/usr/bin/env ensuite-reload

const { join, sep, resolve } = require('path')
const { createServer } = require('http')
const markdownIt = require('markdown-it')
const markdownItAnchor = require('markdown-it-anchor').default
const markdownItToc = require('markdown-it-table-of-contents')
const highlightJs = require('highlight.js')
const glob = require('glob')

module.exports = (app = {}) => Object.assign(app, {

  server: app.server ?? (app.port ?  createServer((req, res)=>app.handle(req, res))
    .listen(app.port, () => console.log(`Listening on ${app.port}`)) : null),

  async handle (req, res) {
    try {
      const data = await app.render(req)
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(data)
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(e.stack)
    }
  },

  async render (req) {
    const url = new URL(req.url, 'http://null')
    if (url.pathname === '/') {
      const tree = await app.renderFileTree()
      const src = url.searchParams.get('page')??'about:blank'
      const iframe = `<iframe name="content" src="${src}"></iframe>`
      const script = `<script>${app.navigationScript}</script>`
      const input = '' //`<input id="prompt" type="text">`
      return app.template(tree, input, iframe, script)
    }
    return app.template(`<content>`, app.renderFile(url.pathname), '</content>')
  },

  template: (...elements) => [
    '<!doctype html>',
    `<html><head><style>${app.style}</style></head>`,
    `<body>`, ...elements, `</body>`,
    '</html>'
  ].join('\n'),

  markdown: (()=>{
    const md = markdownIt({ highlight })
    md.use(markdownItAnchor)
    md.use(markdownItToc, { includeLevel: [2,3,4] })
    return md
    function highlight (str, lang) {
      if (lang && highlightJs.getLanguage(lang)) {
        try {
          return highlightJs.highlight(str, { language: lang }).value;
        } catch (_) {}
      }
      return ''
    }
  })(),

  renderFile (url) {
    console.log('Rendering', url)
    if (url.endsWith('.md')) {
      const data = app.watchRead(join(process.cwd(), url))
      const content = app.markdown.render(`[[toc]]\n\n${data}`)
      const style = `<style>${app.contentStyle}</style>`
      return `${style}${content}`
    } else if (url.endsWith('.pug')) {
      return this.watchRequire('./ensuite-render.cli.cjs')()
    }
  },

  async renderFileTree () {

    const files = [...new Set([
      ...(await glob('**/*.md')),
      ...(await glob('**/*.ts.md')),
      ...(await glob('**/*.pug'))
    ])].sort().map(path=>path.split(sep))

    const tree = {}

    // Convert list of paths into tree
    for (const path of files) {
      let dir = tree
      for (const fragment of path) {
        dir = (dir[fragment] ??= {})
      }
    }

    // Return the rendered tree
    return app.checkboxHack('toggle-file-tree', '', app.renderTree(tree))

  },

  style: app.watchRead(resolve(__dirname, 'ensuite.css')),

  //require('fs').readFileSync(require('path').resolve(require.resolve('highlight.js'), '../../styles/github.css'))
  contentStyle: `
    ul { list-style: initial; margin-bottom: 1rem }
    li { margin-bottom: 0.5rem; margin-left: 1rem }
    h1,h2,h3,h4,h5,h6 { margin-top: 2em }
  `,

  navigationScript: app.watchRead(require('path').resolve(__dirname, 'ensuite-nav.js')),

  checkboxHack (id, text, control) {
    const label = `<label for="${id}" class="toggle">${text}</label>`
    const input = `<input type="checkbox" class="toggle" id="${id}">`
    return `${input}${label}${control}`
  },

  renderTree (tree, prev = '') {
    let output = ''
    for (const name of Object.keys(tree).sort()) {
      const path = `${prev}/${name}`
      if (Object.keys(tree[name]).length === 0) {
        output += `<li><a target="content" href="${path}">${name}</a></li>`
      } else {
        output += `<li>${app.checkboxHack(path, name, app.renderTree(tree[name], prev+'/'+name))}</li>`
      }
    }
    return `<ul>${output}</ul>`
  }

})
