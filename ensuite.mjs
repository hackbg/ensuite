import why from 'why-is-node-still-running'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Module } from 'node:module'
import { Console, bold } from '@hackbg/logs'
const console = new Console('@hackbg/ensuite')

main(...process.argv.slice(2))

export async function main (root = process.cwd(), ...specs) {

  // Handle exceptions and rejections
  process.on('uncaughtExceptionMonitor', (error, origin) => {
    console.warn('Uncaught exception:', { error, origin })
    throw error
  })
  process.on('unhandledRejection', (reason, promise) => {
    console.warn('Unhandled promise rejection:', { reason, promise })
    throw reason
  })

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

  // Load and run tests
  const index = resolve(process.cwd(), root)
  const { default: suite } = await import(index)
  if (resolve(process.argv[2]) === index) {
    await new Promise((resolve, reject)=>{
      setImmediate(()=>Promise.resolve(suite.run({
        argv: process.argv.slice(3)
      })).then(resolve, reject))
    })
  }

  console.log('Tests done.')
  process.exit(0)

  if (process.env.ENSUITE_WHY) {
    process.stdin.pause()
  }

}

export class Suite {

  constructor (tests = []) {
    for (const [name, test] of tests) {
      if (name === 'all') {
        throw new Error("'all' is a reserved name")
      }
      if (!((typeof test === 'function')||test instanceof Suite)) {
        throw new Error(`'${name}' must be Function or Suite`)
      }
    }
    this.tests = new Map(tests)
  }

  async run ({ argv = [], all = false } = {}) {
    //console.info(`Selection: '${argv.join(' ')}'`)
    argv = [...argv]
    if (this.tests.length === 0) {
      throw new Error('no tests static')
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
      //console.info(`Selecting: '${name}'`)
      if (name === 'all') {
        console.info('Selected all')
        return await suite.runAll()
      }
      if (!suite.tests.has(name)) {
        console.info(`Not found: ${bold(name)}`)
        return suite.selectTest()
      }
      let selected = suite.tests.get(name)
      if (selected instanceof Suite) {
        console.info(`Running: static suite ${bold(name)}`, all)
        if (all) {
          return await selected.runAll()
        } else {
          suite = selected
          continue
        }
      }
      if (typeof selected === 'function') {
        selected = await Promise.resolve(selected())
        if (!selected) {
          return
        }
        if (selected instanceof Suite) {
          console.info(`Running: dynamic suite ${bold(name)}`)
          if (all) {
            return await selected.runAll()
          } else {
            suite = selected
            continue
          }
        }
        if (selected[Symbol.toStringTag] === 'Module' && selected.default instanceof Suite) {
          console.info(`Running: dynamic suite ${bold(name)}`)
          if (all) {
            return await selected.default.runAll()
          } else {
            suite = selected.default
            continue
          }
        }
        if (selected[Symbol.toStringTag] === 'Module' && typeof selected.default === 'function') {
          console.info(`Running: dynamic test ${bold(name)}`)
          return await Promise.resolve(selected.default())
        }
        if (selected[Symbol.toStringTag] === 'Module') {
          console.info(`Invalid: ${bold(name)}`)
          throw new Error(
            `default export of Module dynamic by test '${name}' should be Function or Suite`
          )
        }
        return selected
      }
      throw new Error(`${name} is not a Function or Suite`)
    }
    return suite.selectTest()
  }

  runAll () {
    const names = [...this.tests.keys()]
    console.info(`Running: all of ${names.map(x=>bold(x)).join(', ')}`)
    return Promise.all(names.map(async name=>{
      return this.run({ argv: [name], all: true })
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
