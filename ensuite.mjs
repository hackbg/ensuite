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
  //await runSpec(suite.default, specs)
  console.log('Tests done.')
  process.stdin.pause()
}

export class TestSuite {

  constructor (
    root,
    tests = []
  ) {
    this.root = root ? resolve(fileURLToPath(root)) : null
    for (const [name, test] of tests) {
      if (name === 'all') {
        throw new Error("'all' is a reserved name")
      }
      if (!((typeof test === 'function')||test instanceof TestSuite)) {
        throw new Error(`'${name}' must be Function or TestSuite`)
      }
    }
    this.tests = new Map(tests)
    if (resolve(process.argv[2]) === this.root) {
      setImmediate(()=>this.run(...process.argv.slice(3)))
    }
  }

  async run (...argv) {
    if (this.tests.length === 0) {
      throw new Error('no tests defined')
    }
    if (argv.length === 0) {
      return this.selectTest()
    }
    if (argv[0] === 'all') {
      return this.runAll()
    }
    let suite = this
    while (argv.length > 0) {
      const name = argv.shift()
      if (name === 'all') {
        return await suite.runAll()
      }
      if (!suite.tests.has(name)) {
        return suite.selectTest()
      } else if (suite.tests.get(name) instanceof TestSuite) {
        suite = suite.tests.get(name)
      } else if (typeof suite.tests.get(name) === 'function') {
        return await Promise.resolve(suite.tests.get(name)())
      } else {
        throw new Error(`${name} is not a Function or TestSuite`)
      }
    }
    return suite.selectTest()
  }

  runAll () {
    return Promise.all([...this.tests.entries()].map(([name, test])=>{
      console.log('Running test:', name)
      if (typeof test === 'function') {
        return Promise.resolve(test())
      } else if (test instanceof TestSuite) {
        return Promise.resolve(test.runAll())
      }
    }))
  }

  selectTest () {
    console.log('\nPlease specify a test suite to run:')
    console.log(`  all`)
    for (const name of this.tests.keys()) {
      console.log(`  ${name}`)
    }
    console.log()
    process.exit(1)
  }

}
