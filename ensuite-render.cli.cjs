const { readFileSync, writeFileSync } = require('fs')
// Compile the homepage template
const template = require('pug').compileFile(`index.pug`, { self: true })
const data = require('js-yaml').load(readFileSync('ensuite.yml', 'utf8'))
// Render the homepage
writeFileSync(`index.html`, template({
  // When running in CI, debug info is not shown
  CI:       process.env.CI,
  // Markdown renderer
  markdown: require('markdown-it')(),
  // Extra data
  ...data
}))
console.info('Done.')
