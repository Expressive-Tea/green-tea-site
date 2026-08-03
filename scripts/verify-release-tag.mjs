import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function assertReleaseTag(tag, version) {
  const expected = `v${version}`;
  if (tag !== expected) {
    const received = tag || 'an empty tag';
    throw new Error(`Release tag mismatch: expected ${expected}, received ${received}.`);
  }
}

async function main() {
  const packageUrl = new URL('../package.json', import.meta.url);
  const packageJson = JSON.parse(await readFile(packageUrl, 'utf8'));

  assertReleaseTag(process.env.RELEASE_TAG, packageJson.version);
  console.log(`Verified release tag v${packageJson.version}.`);
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (entryUrl === import.meta.url) {
  await main();
}
