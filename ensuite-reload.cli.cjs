#!/usr/bin/env node

const {basename, resolve} = require('path')
const {watch, readFileSync} = require('fs')
const {chdir} = require('process')
const {main, cache} = require

module.exports = (

  app = {},

  watch = (file, cb = (event, name) => console.info('Updated:', name)) => {
    if (!cb) throw new Error(`No watch callback for ${file}`)
    file = resolve(file)
    console.log('Watching:', file)
    app.watchers??=[]
    return require('fs').watch(file, {interval: 100}, cb)
  }

) => Object.assign(app, {

  watch,

  watchers: app.watchers ?? [
    watch(__filename, (...args)=>app.reload(__filename, ...args)),
  ],

  watchRead: file => {
    console.log('Reading:', file)
    app.watch(file)
    return readFileSync(file, 'utf8')
  },

  watchRequire: file => {
    console.log('Requiring:', file)
    app.watch(require.resolve(file), (...args)=>app.reload(file, ...args))
    return require(file)
  },

  root: (app.root && typeof app.root === 'object')
    ? app.root
    : watch(app.root || `./${basename(__filename)}`),

  reload (name, current, previous) {
    console.log('Changed:', name)
    const old = cache[name]
    delete cache[name]
    let update
    try {
      console.log('Reloading:', name)
      update = require(name)
    } catch (e) {
      console.warn('Reload failed:', e)
      cache[name] = old
      return
    }
    const updated = update(app)
    console.log('Flushing watchers...')
    app.watchers.forEach(w=>{w.close();w.unref()})
    Object.assign(app, updated, {
      watchers: [
        app.watch(__filename, (...args)=>app.reload(__filename, ...args))
      ]
    })
  },

})

if (module === main) {
  console.log('Starting...')
  chdir(process.argv[3] ?? '.')
  const app = require(process.argv[2])(module.exports({
    root: process.argv[2],
    port: process.argv[4] ?? 1234,
  }))
}
