import { Suite } from './ensuite.mjs'
import { Console } from '@hackbg/logs'
const console = new Console('test suite for @hackbg/ensuite')

export default new Suite([

  ["test", () => {console.log('ran:test')}],

  ["sub", new Suite([

    ["sub1", () => {console.log('ran:sub1')}],

    ["sub2", () => {console.log('ran:sub2')}],

    ["sub3", new Suite([

      ["sub3a", () => {console.log('ran:sub3a')}],

      ["sub3b", () => {console.log('ran:sub3b')}],

      ["sub3c", () => {console.log('ran:sub3c')}],

    ])],

  ])]

])
