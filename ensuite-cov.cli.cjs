#!/usr/bin/env node

// arguments passed to this command
const argv       = process.argv.slice(2)
// index of "--" in arguments, separating the two argument sets:
const doubleDash = argv.indexOf('--')
// arguments for coverage reporter
const argvCov    = argv.slice(0, doubleDash)
// arguments for test runner
const argvTest   = argv.slice(doubleDash + 1)

const c8 = require('path').resolve(__dirname, 'node_modules', '.bin', 'c8')
require('child_process').execFileSync(c8, [...argvCov, 'ensuite', ...argvTest], {
  env: { ...process.env, Ganesha_NoSourceMap: 1 },
  stdio: 'inherit'
})
