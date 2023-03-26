#!/usr/bin/env node

const {basename, resolve} = require('path')
const {watch, readFileSync} = require('fs')
const {chdir} = require('process')
const {main, cache} = require

module.exports = (

  app = {},

  watch = (
    file,
    cb = (...args)=>app.reload(file, ...args)
  ) => {
    file = resolve(file)
    console.log('Watching', file)
    app.watchers??=[]
    return require('fs').watch(file, {interval: 100}, cb)
  }

) => Object.assign(app, {

  watch,

  watchers: app.watchers ?? [
    watch(__filename),
  ],

  watchRead: file => {
    app.watch(file)
    console.log('Reading', file)
    return readFileSync(file, 'utf8')
  },

  watchRequire: file => {
    app.watch(require.resolve(file))
    console.log('Requiring', file)
    return require(file)
  },

  root: watch(app.root ?? `./${basename(__filename)}`),

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
    Object.assign(app, updated, {
      watchers: [
        app.watch(__filename)
      ]
    })
  },

})

if (module === main) {
  console.log('Starting...')
  chdir(process.argv[3] ?? '.')
  require(process.argv[2])(module.exports({
    root: process.argv[2],
    port: process.argv[4] ?? 1234,
  }))
}
