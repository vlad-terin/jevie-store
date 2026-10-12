// An IPv4 subnet, as a card while it is typed, worked out on this Mac.
//
//   "cidr 10.0.0.0/24", "subnet 192.168.1.130/26", "subnet 172.16.0.0 255.255.240.0"

export const PATTERN = '^(?:cidr|subnet|netmask)\\s+\\d{1,3}(?:\\.\\d{1,3}){3}(?:\\s*/\\s*\\d{1,2}|\\s+\\d{1,3}(?:\\.\\d{1,3}){3})$';
const toInt = ip => ip.split('.').reduce((n, o) => (n * 256) + Number(o), 0) >>> 0;
const toIp = n => [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.');

export function subnet(said) {
  const t = String(said).trim().replace(/^(?:cidr|subnet|netmask)\s+/i, '');
  const m = t.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\s*\/\s*(\d{1,2})|\s+(\d{1,3}(?:\.\d{1,3}){3}))$/);
  if (!m || m[1].split('.').some(o => Number(o) > 255)) return null;
  let bits = m[2] !== undefined ? Number(m[2]) : null;
  if (m[3]) { const mask = toInt(m[3]); const ones = mask.toString(2).replace(/0+$/, ''); if (/0/.test(ones)) return { error: `${m[3]} is not a mask (its ones must come first)` }; bits = ones.length; }
  if (bits > 32) return { error: 'a prefix is 0 to 32' };
  const ip = toInt(m[1]), mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  const network = (ip & mask) >>> 0, broadcast = (network | ~mask) >>> 0;
  const size = 2 ** (32 - bits);
  const hosts = bits >= 31 ? size : size - 2;
  const first = bits >= 31 ? network : network + 1, last = bits >= 31 ? broadcast : broadcast - 1;
  const o1 = Number(m[1].split('.')[0]);
  const kind = o1 === 10 || (o1 === 172 && (ip >>> 20 & 15) === 1) || (o1 === 192 && Number(m[1].split('.')[1]) === 168) ? 'private' : o1 === 127 ? 'loopback' : o1 >= 224 && o1 < 240 ? 'multicast' : 'public';
  return { ip: m[1], bits, network: toIp(network), broadcast: toIp(broadcast), first: toIp(first), last: toIp(last), hosts, mask: toIp(mask), wildcard: toIp(~mask >>> 0), kind };
}

export function cardOf(s, P) {
  const { line, spread, stack, hero, chip, meta, mono, title } = P;
  const summary = `${s.network}/${s.bits}: ${s.first} – ${s.last} (${s.hosts.toLocaleString('en-US')} hosts)`;
  return { summary, copy: summary, complete: 1, body: [
    spread(stack('leading', line(title(`${s.network}/${s.bits}`)), line(meta(`mask ${s.mask} · wildcard ${s.wildcard}`))), stack('trailing', line(hero(s.hosts.toLocaleString('en-US'))), line(chip('usable hosts', 'point.3.connected.trianglepath.dotted')))),
    line(mono(`${s.first} – ${s.last}`)),
    line(meta(`broadcast ${s.broadcast} · ${s.kind}${s.ip !== s.network ? ` · ${s.ip} is in it` : ''}`))
  ] };
}

export default function subnetCard(jevie) {
  const P = jevie.CardParts;
  jevie.registerCard({
    name: 'subnet', label: 'Subnet', symbol: 'point.3.connected.trianglepath.dotted', match: { pattern: PATTERN }, examples: ['cidr 10.0.0.0/24', 'subnet 192.168.1.130/26'],
    async render(said) {
      const s = subnet(said);
      if (!s || s.error) return { summary: 'Subnet', complete: 0, error: true, body: [P.line(P.text(s?.error ?? 'Type an address and a prefix, like 10.0.0.0/24', true))] };
      return cardOf(s, P);
    }
  });
}
