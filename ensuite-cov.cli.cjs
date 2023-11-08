#!/usr/bin/env node
const { Console, bold } = require('@hackbg/logs')
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
  config = require('js-yaml').load(require('fs').readFileSync('ensuite.yml', 'utf8'))
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
  .log('Arguments to c8:', bold(argvCov.join(' ')))
  .log('Arguments to ensuite:', bold(argvTest.join(' ')))
const c8 = require('path').resolve(__dirname, 'node_modules', '.bin', 'c8')
const c8args = [...argvCov, require.resolve('./ensuite.cli.cjs'), ...argvTest]
require('child_process').execFileSync(c8, c8args, {
  env: { ...process.env, Ganesha_NoSourceMap: 1 },
  stdio: 'inherit'
})
