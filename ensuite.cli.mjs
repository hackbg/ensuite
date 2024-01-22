#!/usr/bin/env -S node --import @ganesha/esbuild
import main from './ensuite.mjs'
main(...process.argv.slice(2))
