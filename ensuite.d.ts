export function main (root?: string, ...specs: any[])

export class TestSuite {
  constructor (root: string|URL, tests: Array<[string, Function]>)
  pickTest (picked?: string): Promise<unknown[]>
  testAll (): Promise<unknown[]>
}
