import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

export default function workspaceInfo(jevie) {
  jevie.registerTool({
    name: 'package',
    description: 'Read the name, version, scripts, and dependencies from a local project package.json.',
    readOnly: true,
    inputSchema: {
      type: 'object', properties: { directory: { type: 'string', minLength: 1, description: 'Absolute project directory' } },
      required: ['directory'], additionalProperties: false
    },
    async execute({ directory }, { signal }) {
      const path = join(resolve(directory), 'package.json');
      const pkg = JSON.parse(await readFile(path, { encoding: 'utf8', signal }));
      return { name: pkg.name ?? '(unnamed)', version: pkg.version ?? '', scripts: pkg.scripts ?? {}, dependencies: pkg.dependencies ?? {} };
    }
  });
  jevie.registerCommand('help', {
    description: 'Show how to inspect a project package.', readOnly: true,
    execute: () => 'Use @ext-workspace-info package directory=/path/to/project to read its package.json.'
  });
}
