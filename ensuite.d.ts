export function main (root?: string, ...specs: any[])

export class TestSuite {
  constructor (root: string|URL, tests: Array<[string, Function]>)
  run (...argv: string[]): Promise<unknown>
  runAll (): Promise<unknown[]>
}
