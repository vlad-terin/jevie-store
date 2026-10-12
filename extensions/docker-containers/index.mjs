// Docker containers, as Raycast's Docker extension lists them: each with its
// image, status and ports; the one in hand's details and last log lines in
// the preview; Stop, Restart and Logs on a running one's row, Start and
// Remove on a stopped one's. Reading is a command; every change is a tool,
// so Jevie shows what will run and asks first. When the daemon is down
// (Colima stopped), the list says so and offers to start it.

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';

const find = name => [`/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`].find(existsSync) ?? name;
const DOCKER = find('docker'), COLIMA = find('colima');

function run(program, args, { signal, timeout = 15000 } = {}) {
  return new Promise((done, fail) => execFile(program, args, { signal, timeout, maxBuffer: 16 * 1024 * 1024 },
    (error, out, err) => error ? fail(new Error(String(err || error.message).trim().split('\n').pop())) : done(String(out))));
}

/// `docker ps -a --format '{{json .}}'` as rows, running first.
export function parseContainers(text) {
  return String(text).trim().split('\n').filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean)
    .map(c => ({ id: c.ID, name: c.Names, image: c.Image, state: c.State, status: c.Status, ports: c.Ports ?? '', created: c.CreatedAt ?? '' }))
    .sort((a, b) => (b.state === 'running') - (a.state === 'running') || a.name.localeCompare(b.name));
}

const NAME = /^[\w.-]+$/;

export default function dockerContainers(jevie) {
  const { List, command } = jevie;
  const call = (verb, name) => `@ext-docker-containers ${verb} name=${name}`;

  jevie.registerSurface(command({
    names: ['docker containers', 'containers', 'docker ps'],
    what: 'Docker containers: what is running, their logs, and stop, restart or start on each row',
    examples: ['docker containers', 'containers running', 'docker containers postgres'],
    reversible: true,   // it only reads
    async run(text) {
      const signal = AbortSignal.timeout(15000);
      let rows;
      try { rows = parseContainers(await run(DOCKER, ['ps', '-a', '--format', '{{json .}}'], { signal })); }
      catch (error) {
        const down = /daemon|Cannot connect|colima/i.test(error.message);
        return List({ title: 'Docker', items: [{ title: down ? 'Docker is not running' : 'Docker could not be read', subtitle: down ? 'Colima is stopped' : error.message,
          icon: 'shippingbox', ...(down && existsSync(COLIMA) ? { buttons: [{ title: 'Start Colima', symbol: 'play', says: '@ext-docker-containers start-colima' }], says: '@ext-docker-containers start-colima' } : {}) }],
          spoken: down ? 'Docker is not running.' : 'Docker could not be read.' });
      }
      const words = String(text).toLowerCase().replace(/\b(?:running|all)\b/g, '').trim();
      if (/\brunning\b/i.test(text)) rows = rows.filter(r => r.state === 'running');
      if (words) rows = rows.filter(r => `${r.name} ${r.image}`.toLowerCase().includes(words));
      // The last log lines of the running ones, for the preview (eight at once).
      const logs = await Promise.all(rows.map((r, i) => r.state === 'running' && i < 8
        ? run(DOCKER, ['logs', '--tail', '25', r.name], { signal, timeout: 5000 }).catch(() => '') : Promise.resolve('')));
      return List({
        title: `Docker · ${rows.filter(r => r.state === 'running').length} running`,
        empty: words ? `No container matches ${words}.` : 'No containers.',
        spoken: `${rows.length} containers, ${rows.filter(r => r.state === 'running').length} running.`,
        items: rows.map((r, i) => ({
          title: r.name,
          subtitle: `${r.image} · ${r.status}${r.ports ? ` · ${r.ports}` : ''}`,
          accessory: r.state,
          icon: r.state === 'running' ? 'shippingbox.fill' : 'shippingbox',
          says: call('logs', r.name),
          preview: [`# ${r.name}`, `**${r.state}** · ${r.status}`, `**Image:** ${r.image}`, r.ports ? `**Ports:** ${r.ports}` : '', `**Created:** ${r.created}`,
            logs[i] ? `---\n\n**Last lines of its log**\n\n\`\`\`\n${logs[i].trim().split('\n').slice(-25).join('\n')}\n\`\`\`` : ''].filter(Boolean).join('\n\n'),
          buttons: r.state === 'running'
            ? [{ title: 'Stop', symbol: 'stop.fill', says: call('stop', r.name), key: 's' }, { title: 'Restart', symbol: 'arrow.clockwise', says: call('restart', r.name) }, { title: 'Logs', symbol: 'text.alignleft', says: call('logs', r.name) }]
            : [{ title: 'Start', symbol: 'play.fill', says: call('start', r.name) }, { title: 'Remove', symbol: 'trash', says: call('remove', r.name) }]
        }))
      });
    }
  }));

  // What changes a container: tools, so Jevie shows the call and asks first.
  for (const [verb, args, description] of [['start', ['start'], 'Start a stopped container.'], ['stop', ['stop'], 'Stop a running container.'],
    ['restart', ['restart'], 'Restart a container.'], ['remove', ['rm'], 'Remove a stopped container.']]) {
    jevie.registerTool({
      name: verb, description,
      inputSchema: { type: 'object', properties: { name: { type: 'string', pattern: NAME.source } }, required: ['name'], additionalProperties: false },
      async execute({ name }, context) {
        await run(DOCKER, [...args, name], { signal: context.signal, timeout: 60000 });
        return { status: 'ok', spoken: `${verb === 'remove' ? 'Removed' : `${verb[0].toUpperCase()}${verb.slice(1)}ed`.replace('Stoped', 'Stopped')} ${name}.`, lines: [{ title: `docker ${args[0]} ${name}`, subtitle: 'done' }] };
      }
    });
  }
  jevie.registerTool({
    name: 'logs', description: 'The last lines of a container’s log.', readOnly: true,
    inputSchema: { type: 'object', properties: { name: { type: 'string', pattern: NAME.source } }, required: ['name'], additionalProperties: false },
    async execute({ name }, context) {
      const out = await run(DOCKER, ['logs', '--tail', '200', name], { signal: context.signal, timeout: 15000 });
      return { status: 'ok', spoken: `The log of ${name}.`, markdown: `# ${name}\n\n\`\`\`\n${out.trim().split('\n').slice(-200).join('\n')}\n\`\`\``, lines: [{ title: `${name} · log`, subtitle: `${out.trim().split('\n').length} lines` }] };
    }
  });
  jevie.registerTool({
    name: 'start-colima', description: 'Start Colima, the Docker daemon on this Mac.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async execute(_args, context) {
      await run(COLIMA, ['start'], { signal: context.signal, timeout: 180000 });
      return { status: 'ok', spoken: 'Colima is running.', lines: [{ title: 'colima start', subtitle: 'Docker is running' }] };
    }
  });
}
