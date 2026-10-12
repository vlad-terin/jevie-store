import { join } from 'node:path';
import { search } from './search.mjs';

export default function jevgrep(jevie) {
  jevie.registerTool({
    name: 'search',
    description: 'Experimental: find code by what it does in an explicit absolute repository directory. Returns verbatim source and line references, including incomplete-search status. Sends eligible source to the saved jevgrep provider. Use ordinary file navigation for folders and exact-name lookup.',
    readOnly: true,
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 2000 },
        directory: { type: 'string', minLength: 1, description: 'Absolute directory of the repository or source subtree to search' }
      },
      required: ['query', 'directory']
    },
    execute: (args, context) => search(args, {
      signal: context.signal,
      cli: join(context.directory, 'node_modules/@dzhng/jevgrep/dist/bin/index.js')
    })
  });
}
