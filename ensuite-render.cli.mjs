#!/usr/bin/env ganesha-run
import md from './ensuite-md.js'
import { compileFile } from 'pug'
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
  for (const { path, page } of routes) {
    // Trim leading slashes
    while (_path.startsWith('/')) _path = _path.slice(1)
    // Render page
    const { path, shortPath } = $(root, output, _path)
    writeFileSync(path, await renderPath({ dev: false }, page))
  }
}

export async function renderUrl (state, url) {
  let {pathname, searchParams} = url
  if (pathname === '/') pathname = '/index.pug'
  return renderPath({ ...state??{}, dev: true }, pathname)
}

export async function renderPath (state, path) {
  while (path.startsWith('/')) path = path.slice(1)
  path = resolve(path)
  // Render document types
  let result = null
  switch (true) {
    case path.endsWith('.pug'): result = await renderPug(path); break
    case path.endsWith('.md'):  result = await renderMd(path);  break
  }
  // Add navigation in dev mode
  if (!result) {
    result = readFileSync(path)
  } else if (state?.dev) {
    result = await injectNavigation(result)
  }
  return result
}

export async function renderMd (
  path
) {
  console.log('Rendering Markdown:', path)
  const data = readFileSync(path)
  const {
    styles = [],
    header: {
      title = 'Rendered with Ensuite',
      link,
      links = []
    } = {}
  } = load(readFileSync('ensuite.yml', 'utf8'))
  return renderPage([
    ...styles.map(path=>style(path, readFileSync(path))),
    `<header class="ensuite-md-header">`,
    `<a class="ensuite-md-title" href="${link}">The <strong>${title}</strong> Guide</a>`,
    `<div class="ensuite-md-separator"></div>`,
    ...links.map(({text,href})=>`<a class="ensuite-md-link" href=${href}>${text}</a>`),
    `</header>`,
    '<content class="ensuite-md-rendered">',
    md.render(`[[toc]]\n\n${data}`),
    '</content>',
  ])
}

export function renderPug (
  path = 'index.pug',
  data = load(readFileSync('ensuite.yml', 'utf8')),
) {
  console.log('Rendering Pug:', path)
  // Compile the homepage template
  const template = compileFile(path, { self: true })
  // Render the homepage
  return template({
    // When running in CI, debug info is not shown
    CI:       process.env.CI,
    // Markdown renderer
    markdown: md,
    // Extra data
    ...data
  })
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

async function renderPage (body = [], options = {}) {
  const {
    title = "Rendered by Ensuite",
    csp   = "default-src 'self' http: https: ws: wss: 'unsafe-inline';"
  } = options
  return [
    '<!doctype html>', '<html>', '<head>', `<meta charset="utf-8">`,
    `<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />`,
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    `<title>${title}</title>`,
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

