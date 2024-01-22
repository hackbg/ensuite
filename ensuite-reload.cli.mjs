#!/usr/bin/env node

const {basename, dirname, resolve} = require('path')
const {chdir} = require('process')

module.exports = Object.assign(runMain, {
  watch,
  requireLive,
  reload
})

if (module === require.main) {
  runMain(...process.argv.slice(2))
}

function runMain (script, ...args) {
  script = require.resolve(script)
  console.info('Running:', script, args)
  let main
  let state
  const update = () => state = main(state, ...args)
  main = requireLive(script, update)
  update()
}

function watch (file, cb) {
  if (!cb) throw new Error(`No watch callback for ${file}`)
  file = resolve(file)
  console.log('Watching:', file)
  return require('fs').watch(file, {interval: 100}, cb)
}

function requireLive (file, update = () => {}) {
  console.log('Requiring:', file)
  let watcher
  let updated = (...args)=>{
    reload(watcher, file, ...args)
    watcher = watch(require.resolve(file), updated)
    update()
  }
  watcher = watch(require.resolve(file), updated)
  return require(file)
}

function reload (watcher, name, current, previous) {
  name = require.resolve(name)
  console.log('Changed:', name)
  const old = require.cache[name]
  delete require.cache[name]
  try {
    console.log('Reloading:', name)
    require(name)
  } catch (e) {
    console.warn('Reload failed:', e)
    require.cache[name] = old
  } finally {
    watcher.close()
    watcher.unref()
    return
  }
}
