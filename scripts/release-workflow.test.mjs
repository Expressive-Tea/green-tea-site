import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('publishes beta tags as GitHub prereleases', async () => {
  const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');

  assert.match(
    workflow,
    /uses: softprops\/action-gh-release@v2[\s\S]*?with:\s*\n\s+prerelease: true\s*\n\s+files:/,
  );
});
