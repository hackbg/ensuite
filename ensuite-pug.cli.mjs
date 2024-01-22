import { readFileSync, writeFileSync } from 'node:fs'

if (require.main === module) {
  writeFileSync(`index.html`, module.exports())
  console.info(`Wrote index.html`)
}
