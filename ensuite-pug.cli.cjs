const { readFileSync, writeFileSync } = require('fs')

module.exports = function render (
  templatePath = 'index.pug',
  data = require('js-yaml').load(readFileSync('ensuite.yml', 'utf8')),
) {
  // Compile the homepage template
  const template = require('pug').compileFile(templatePath, { self: true })
  // Render the homepage
  return template({
    // When running in CI, debug info is not shown
    CI:       process.env.CI,
    // Markdown renderer
    markdown: require('markdown-it')(),
    // Extra data
    ...data
  })
}

if (require.main === module) {
  writeFileSync(`index.html`, module.exports())
  console.info(`Wrote index.html`)
}
