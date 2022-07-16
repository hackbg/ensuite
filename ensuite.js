import why from 'why-is-node-still-running'
import { runSpec } from '@hackbg/runspec'
import { resolve} from 'path'
main(...process.argv.slice(2))
export async function main (root, ...specs) {

  // If tests don't exit, press "?" to see why
  if (process.stdin.setRawMode) process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', key => {
    if (key === '\u0003' || key === '\u0004') {
      process.exit(100)
    }
    if (key === '?') {
      why.whyIsNodeStillRunning()
    }
  })

  // Run tests
  const index = resolve(process.cwd(), root)
  const suite = await import(index)
  await runSpec(suite.default, specs)

  console.log('Tests done.')
  process.stdin.pause()

}
