import { TestSuite } from './ensuite.mjs'
import { Console } from '@hackbg/logs'
const console = new Console('test suite for @hackbg/ensuite')

export default new TestSuite([

  ["test", () => {console.log('ran:test')}],

  ["sub", new TestSuite("", [

    ["sub1", () => {console.log('ran:sub1')}],

    ["sub2", () => {console.log('ran:sub2')}],

    ["sub3", new TestSuite("", [

      ["sub3a", () => {console.log('ran:sub3a')}],

      ["sub3b", () => {console.log('ran:sub3b')}],

      ["sub3c", () => {console.log('ran:sub3c')}],

    ])],

  ])]

])
