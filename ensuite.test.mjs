import { TestSuite } from './ensuite.mjs'

export default new TestSuite(import.meta.url, [

  ["test", () => {}],

  ["sub", new TestSuite("", [

    ["sub1", () => {}],
    ["sub2", () => {}],

  ])]

])
