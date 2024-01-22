#!/usr/bin/env node

import { Console, bold } from '@hackbg/logs'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'js-yaml'

const console = new Console('@hackbg/ensuite')

const argv = process.argv.slice(2)    // arguments passed to command
const doubleDash = argv.indexOf('--') // "--" in arguments separates two argument sets
let [
  argvCov,                            // arguments for coverage reporter
  argvTest,                           // arguments for test runner
] = (doubleDash < 0)
  ? [ [], argv ]                      // no double dash, all args to test
  : [ argv.slice(0, doubleDash), argv.slice(doubleDash + 1) ]

let config

try {
  config = load(readFileSync('ensuite.yml', 'utf8'))
} catch (e) {
  console
    .warn(`Failed to load ensuite.yml (${e.code}).`)
    .warn(`You need to create this file in ${bold(process.cwd())} to measure coverage for this project.`)
}

const { coverage: { exclude = [] } = {} } = config || {}

argvCov = [ '--all', ...argvCov, '-r', 'lcov', '-r', 'text' ]
for (const path of exclude) {
  argvCov.push('--exclude')
  argvCov.push(JSON.stringify(path))
}

console
  .debug('Arguments to c8:', bold(argvCov.join(' ')))
  .debug('Arguments to ensuite:', bold(argvTest.join(' ')))

// Run ensuite with c8
const pkg    = dirname(fileURLToPath(import.meta.url))
    , c8     = resolve(pkg, 'node_modules', '.bin', 'c8')
    , cli    = resolve(pkg, 'ensuite.cli.mjs')
    , c8args = [...argvCov, require.resolve('./ensuite.cli.cjs'), ...argvTest]
    , env    = { ...process.env, GANESHA_NO_SOURCE_MAP: 1 }
execFileSync(c8, c8args, { env, stdio: 'inherit' })
