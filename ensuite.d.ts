export function main (root?: string, ...specs: any[]): Promise<never>

export class Suite {
  constructor (tests: Array<[string, Function]>)
  run (argv: string[], arg?: boolean): Promise<unknown>
  runAll (): Promise<unknown[]>
}
