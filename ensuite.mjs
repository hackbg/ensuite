import why from 'why-is-node-still-running'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Module } from 'node:module'

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
      console.log(`Selecting: '${name}'`)
      if (name === 'all') {
        console.log('Selected: all')
        return await suite.runAll()
      }
      if (!suite.tests.has(name)) {
        console.log(`Not found: '${name}'`)
        return suite.selectTest()
      }
      let selected = suite.tests.get(name)
      if (selected instanceof TestSuite) {
        console.log(`Selected: suite '${name}'`)
        suite = selected
        continue
      }
      if (typeof selected === 'function') {
        selected = await Promise.resolve(selected())
        if (!selected) {
          return
        }
        console.log({selected}, selected instanceof Module)
        if (selected instanceof TestSuite) {
          console.log(`Selected: suite '${name}'`)
          suite = selected
          continue
        }
        if (selected[Symbol.toStringTag] === 'Module' && selected.default instanceof TestSuite) {
          console.log(`Selected: suite '${name}'`)
          suite = selected.default
          continue
        }
        if (selected[Symbol.toStringTag] === 'Module' && typeof selected.default === 'function') {
          console.log(`Selected: test '${name}'`)
          return await Promise.resolve(selected())
        }
        if (selected[Symbol.toStringTag] === 'Module') {
          console.log(`Selected: invalid '${name}'`)
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
    console.log({names})
    return Promise.all(names.map(async name=>{
      console.log('Running test:', name)
      return this.run(name)
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
