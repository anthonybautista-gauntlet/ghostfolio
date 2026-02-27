import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export async function loadYamlFile<T>({ path }: { path: string }): Promise<T> {
  const raw = await readFile(path, 'utf8');
  const yamlModule = require('yaml') as {
    parse: (yaml: string) => unknown;
  };

  return yamlModule.parse(raw) as T;
}
