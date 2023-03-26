#!/usr/bin/env node

const {basename} = require('path')
const {watch, readFileSync} = require('fs')
const {chdir} = require('process')
const {main, cache, resolve} = require

module.exports = (app = {}) => {

  return Object.assign(app, {

    watch: watched,

    watchRead (file) {
      return readFileSync(app.watch(file), 'utf8')
    },

    watchRequire (file) {
      app.watch(require.resolve(file))
      return require(file)
    },

    root: watched(app.root ?? `./${basename(__filename)}`),

    watchers: app.watchers ?? [],

    reload (name, current, previous) {
      console.log('Changed', name)
      const old = cache[name]
      delete cache[name]
      let update
      try {
        console.log('Reloading', name)
        update = require(name)
      } catch (e) {
        console.warn('Reload failed', e)
        cache[name] = old
        return
      }
      const updated = update(app)
      console.log('Flushing watchers')
      app.watchers.forEach(w=>{w.close();w.unref()})
      app.watchers = []
      Object.assign(app, updated)
      watched(app.root)
    },

  })

  function watched (file) {
    file = require('path').resolve(file)
    console.log('Watching', file)
    app.watchers??=[]
    app.watchers.push(watch(file, {interval: 100}, (...args)=>app.reload(file, ...args)))
    return file
  }

}

if (module === main) {
  console.log('Starting...')
  chdir(process.argv[3] ?? '.')
  require(process.argv[2])(module.exports({
    root: process.argv[2],
    port: process.argv[4] ?? 1234,
  }))
}
