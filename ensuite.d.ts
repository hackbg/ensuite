export function main (root?: string, ...specs: any[])

export function testEntrypoint (url: string|URL, tests: Record<string, Function>): typeof tests

export function pickTest (tests: Record<string, Function>, picked?: string): never

export function testAll (tests: Record<string, Function>): Promise<unknown[]>

export function testSuite (path: string): () => Promise<never>
