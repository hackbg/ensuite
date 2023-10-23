import why from 'why-is-node-still-running'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Module } from 'node:module'
import { Console } from '@hackbg/logs'
const console = new Console('@hackbg/ensuite')

main(...process.argv.slice(2))

export async function main (root = process.cwd(), ...specs) {

  // If tests don't exit, press "?" to see why
  if (process.env.ENSUITE_WHY) {
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
  }

  // Run tests
  const index = resolve(process.cwd(), root)
  const { default: suite } = await import(index)
  if (resolve(process.argv[2]) === index) {
    await new Promise(resolve=>{
      setImmediate(async ()=>{
        await Promise.resolve(suite.run({ argv: process.argv.slice(3) }))
        resolve()
      })
    })
  }

  console.log('Tests done.')

  if (process.env.ENSUITE_WHY) {
    process.stdin.pause()
  }

}

export class TestSuite {

  constructor (tests = []) {
    for (const [name, test] of tests) {
      if (name === 'all') {
        throw new Error("'all' is a reserved name")
      }
      if (!((typeof test === 'function')||test instanceof TestSuite)) {
        throw new Error(`'${name}' must be Function or TestSuite`)
      }
    }
    this.tests = new Map(tests)
  }

  async run ({ argv = [] } = {}) {
    argv = [...argv]
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
      console.debug(`Selecting: '${name}'`)
      if (name === 'all') {
        console.debug('Selected: all')
        return await suite.runAll()
      }
      if (!suite.tests.has(name)) {
        console.debug(`Not found: '${name}'`)
        return suite.selectTest()
      }
      let selected = suite.tests.get(name)
      if (selected instanceof TestSuite) {
        console.debug(`Selected: suite '${name}'`)
        suite = selected
        continue
      }
      if (typeof selected === 'function') {
        selected = await Promise.resolve(selected())
        if (!selected) {
          return
        }
        console.debug({selected}, selected instanceof Module)
        if (selected instanceof TestSuite) {
          console.debug(`Selected: suite '${name}'`)
          suite = selected
          continue
        }
        if (selected[Symbol.toStringTag] === 'Module' && selected.default instanceof TestSuite) {
          console.debug(`Selected: suite '${name}'`)
          suite = selected.default
          continue
        }
        if (selected[Symbol.toStringTag] === 'Module' && typeof selected.default === 'function') {
          console.debug(`Selected: test '${name}'`)
          return await Promise.resolve(selected())
        }
        if (selected[Symbol.toStringTag] === 'Module') {
          console.debug(`Selected: invalid '${name}'`)
          throw new Error(
            `default export of Module returned by test '${name}' should be Function or TestSuite`
          )
        }
        return selected
      }
      throw new Error(`${name} is not a Function or TestSuite`)
    }
    return suite.selectTest()
  }

  runAll () {
    const names = [...this.tests.keys()]
    return Promise.all(names.map(async name=>{
      console.debug('Running test:', name)
      return this.run({ argv: [name] })
    }))
  }

  selectTest () {
    console.info('Please specify a test suite to run:')
    console.info(`  all`)
    for (const name of this.tests.keys()) {
      console.info(`  ${name}`)
    }
    process.exit(1)
  }

}
