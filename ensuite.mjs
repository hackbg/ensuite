import why from 'why-is-node-still-running'
import { runSpec } from '@hackbg/spec'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

main(...process.argv.slice(2))

export async function main (root = process.cwd(), ...specs) {
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

export class TestSuite {

  constructor (root, tests = []) {
    this.root = resolve(fileURLToPath(root))
    this.tests = tests
    if (resolve(process.argv[2]) === this.root) this.pickTest(process.argv[3])
  }

  async pickTest (picked) {
    if (this.tests.length === 0) {
      throw new Error('no tests defined')
    }
    if (picked === 'all') return this.testAll()
    const test = this.tests[picked]
    if (test) return await test()
    console.log('\nSpecify suite to run:')
    console.log(`  all`)
    for (const test of Object.keys(tests)) {
      console.log(`  ${test}`)
    }
    console.log()
    process.exit(1)
  }

  async testAll () {
    const runs = this.tests.map(([name, test])=>{
      console.log('Running test:', name)
      return Promise.resolve(test())
    })
    return await Promise.all(runs)
  }

}
