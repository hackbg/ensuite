const markdown = require('markdown-it')({
  highlight (str, lang) {
    const highlightJs = require('highlight.js')
    if (lang && highlightJs.getLanguage(lang)) {
      try {
        return highlightJs.highlight(str, { language: lang }).value;
      } catch (_) {}
    }
    return ''
  }
})

markdown.use(require('markdown-it-anchor').default)
markdown.use(require('markdown-it-table-of-contents'), { includeLevel: [2,3,4] })

module.exports = markdown
