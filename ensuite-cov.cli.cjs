#!/usr/bin/env node

const argv = process.argv.slice(2)    // arguments passed to command

const doubleDash = argv.indexOf('--') // "--" in arguments separates two argument sets

const [
  argvCov,                            // arguments for coverage reporter
  argvTest,                           // arguments for test runner
] = (doubleDash < 0)
  ? [ [], argv ]                      // no double dash, all args to test
  : [ argv.slice(0, doubleDash), argv.slice(doubleDash + 1) ]

argvCov.unshift('--all')

const { coverage: { exclude = [] } = {} } =
  require('js-yaml').load(require('fs').readFileSync('ensuite.yml', 'utf8'))

for (const path of exclude) {
  argvCov.push('--exclude')
  argvCov.push(JSON.stringify(path))
}

console.log('Arguments to c8:', ...argvCov)
console.log('Arguments to ensuite:', ...argvTest)

const c8 = require('path').resolve(__dirname, 'node_modules', '.bin', 'c8')
const c8args = [...argvCov, 'ensuite', ...argvTest]
console.log('>', c8, ...c8args)
require('child_process').execFileSync(c8, c8args, {
  env: { ...process.env, Ganesha_NoSourceMap: 1 },
  stdio: 'inherit'
})
