#!/usr/bin/env node
const ganesha = require.resolve('@hackbg/ganesha/index.js')
const ensuite = require.resolve('./ensuite.mjs')
require('@hackbg/ganesha').main([
  process.argv[0],
  ganesha,
  ensuite,
  ...process.argv.slice(2)
])
