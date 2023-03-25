#!/usr/bin/env node

const {basename} = require('path')
const {watch, readFileSync} = require('fs')
const {chdir} = require('process')
const {main, cache, resolve} = require

module.exports = (app = {}) => {

  return Object.assign(app, {

    watch: watched,

    loadWatch: file => readFileSync(app.watch(file), 'utf8'),

    root: watched(app.root ?? `./${basename(__filename)}`),

    watchers: app.watchers ?? [],

    reload: (name, current, previous) => {
      console.log('Changed', name)
      console.log('Flushing watchers')
      app.watchers.forEach(w=>{w.close();w.unref()})
      app.watchers = []
      const old = cache[resolve(app.root)]
      delete cache[resolve(app.root)]
      try {
        console.log('Reloading', app.root)
        Object.assign(app, require(app.root)(app))
        watched(app.root)
      } catch (e) {
        console.warn('Reload failed', e)
        cache[resolve(app.root)] = old
      }
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
  console.log('Starting...', process.argv)
  chdir(process.argv[3] ?? '.')
  require(process.argv[2])(module.exports({
    root: process.argv[2],
    port: process.argv[4] ?? 1234,
  }))
}
