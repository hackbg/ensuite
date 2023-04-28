import md       from 'markdown-it'
import mdAnchor from 'markdown-it-anchor'
import mdToc    from 'markdown-it-table-of-contents'
import mdHilite from 'markdown-it-highlightjs'

const markdown = md()
markdown.use(mdAnchor)
markdown.use(mdToc, { includeLevel: [2,3,4] })
markdown.use(mdHilite)

export default markdown
