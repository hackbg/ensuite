#!/usr/bin/env ganesha-run
import md from './ensuite-md.js'
import renderPug from './ensuite-pug.cli.cjs'
import { Console } from '@hackbg/logs'
import $ from '@hackbg/file'
import { load } from 'js-yaml'
import glob from 'glob'
import { fileURLToPath } from 'node:url'
import { resolve, dirname, sep } from 'node:path'
import { readFileSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'

const console = new Console('ensuite-render')

if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url))
  main({}, process.argv.slice(2))

export default async function main (state, args) {
  // Parse arguments
  const [ root = process.cwd() ] = args
  console.log('root:', root)
  // Load ensuite.yml
  const { output = ".docs", routes = [] } =
    load(readFileSync(resolve('ensuite.yml'), 'utf8'))
  // Create output directory
  try { mkdirSync(resolve(root, output)) } catch (e) { if (e.code !== 'EEXIST') throw e }
  // Render each defined route
  for (let { path: _path, page } of routes) {
    // Trim leading slashes
    while (_path.startsWith('/')) _path = _path.slice(1)
    // Render page
    const { path, shortPath } = $(root, output, _path)
    console.log('render:', shortPath)
    if (page.endsWith('.pug')) {
      console.log('pug:', page)
      writeFileSync(path, renderPug(page))
    } else if (page.endsWith('.md')) {
      console.log('markdown:', page)
      writeFileSync(path, await renderMd(page))
    }
  }
}

export async function render (url) {
  let {pathname, searchParams} = url
  if (pathname === '/') pathname = '/index.pug'
  while (pathname.startsWith('/')) pathname = pathname.slice(1)
  const path = resolve(pathname)
  console.log('Rendering:', pathname, path)
  if (path.endsWith('.pug')) {
    return await injectNavigation(await renderPug(path))
  } else if (path.endsWith('.md')) {
    return await injectNavigation(await renderMd(path))
  } else {
    return readFileSync(path)
  }
}

export async function renderMd (path) {
  const data = readFileSync(path)
  const {styles = []} = load(readFileSync('ensuite.yml', 'utf8'))
  return page([
    ...styles.map(path=>style(path, readFileSync(path))),
    '<content class="ensuite-md-rendered">',
    md.render(`[[toc]]\n\n${data}`),
    '</content>',
  ])
}

async function injectNavigation (html) {
  const __dirname = resolve(dirname(fileURLToPath(import.meta.url)))
  return [
    html,
    style(   'ensuite', readFileSync(resolve(__dirname, 'ensuite-nav.css'), 'utf8')),
    template('ensuite', checkboxHack('toggle-file-tree', '', renderTree(await scopeTree()))),
    script(  'ensuite', readFileSync(resolve(__dirname, 'ensuite-nav.js'), 'utf8')),
  ].join('\n')
}

function style (name, data) {
  return `<style name="${name}" type="text/css">${data}</style>`
}

function script (name, data) {
  return `<script name="${name}" type="text/javascript">${data}</script>`
}

function template (name, data) {
  return `<template name="${name}">${data}</template>`
}

async function page (body = []) {
  const csp = "default-src 'self' http: https: ws: wss: 'unsafe-inline';"
  return [
    '<!doctype html>', '<html>', '<head>', `<meta charset="utf-8">`,
    `<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />`,
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    '</head>', '<body>', ...body, '</body>', '</html>'
  ].join('\n')
}

/** Get a tree of in-scope files for the project. */
/** Render the navigation tree. */
async function navigation () {
  return [
    style('ensuite.css', __dirname),
    checkboxHack('toggle-file-tree', '', renderTree(await scopeTree()))
  ]
}

function checkboxHack (id, text, control) {
  const label = `<label for="${id}" class="toggle">${text}</label>`
  const input = `<input type="checkbox" class="ensuite-toggle" id="${id}">`
  return `${input}${label}${control}`
}

function renderTree (tree, prev = '') {
  let output = ''
  // Render leaves first
  for (const name of Object.keys(tree).filter(x=>Object.keys(tree[x]).length === 0).sort()) {
    const path = `${prev}/${name}`
    output += `<li><a href="${path}">${name}</a></li>`
  }
  // Render branches
  for (const name of Object.keys(tree).filter(x=>Object.keys(tree[x]).length > 0).sort()) {
    const path = `${prev}/${name}`
    output += `<li>${checkboxHack(path, name, renderTree(tree[name], prev+'/'+name))}</li>`
  }
  return `<ul>${output}</ul>`
}

async function scopeTree () {
  // Get all files matching filter
  const paths = [...new Set([
    ...(await glob('**/*.md')),
    ...(await glob('**/*.pug'))
  ])]
    .sort()
    .map(path=>path.split(sep))
    .sort((a,b)=>a.length-b.length)
  // Convert list of paths into tree
  const tree = {}
  for (const path of paths) {
    let dir = tree
    for (const fragment of path) {
      dir = (dir[fragment] ??= {})
    }
  }
  return tree
}

