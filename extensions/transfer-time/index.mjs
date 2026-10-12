// A transfer's time, as a card while it is typed, worked out on this Mac:
// size in bytes (KB, MB, GB, TB in powers of 1000; KiB … in 1024) over the
// speed in bits a second (kbps, Mbps, Gbps) or bytes (KB/s, MB/s, GB/s).
//
//   "download 50 gb at 100 mbps", "upload 500 mb at 20 mbps", "transfer 2 tb at 1 gbps", "copy 40 gib at 250 mb/s"

export const PATTERN = '^(?:download|upload|transfer|copy|send|sync)\\s+[\\d.]+\\s*(?:kb|mb|gb|tb|kib|mib|gib|tib)\\s+(?:at|over|on)\\s+[\\d.]+\\s*(?:kbps|mbps|gbps|kbit/s|mbit/s|gbit/s|kb/s|mb/s|gb/s)$';
const SIZE = { kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4 };
const SPEED = { kbps: 1e3, mbps: 1e6, gbps: 1e9, 'kbit/s': 1e3, 'mbit/s': 1e6, 'gbit/s': 1e9, 'kb/s': 8e3, 'mb/s': 8e6, 'gb/s': 8e9 };
export function transfer(said) {
  const t = String(said).toLowerCase();
  const s = t.match(/([\d.]+)\s*(kib|mib|gib|tib|kb|mb|gb|tb)\s+(?:at|over|on)/), v = t.match(/(?:at|over|on)\s+([\d.]+)\s*(kbps|mbps|gbps|kbit\/s|mbit\/s|gbit\/s|kb\/s|mb\/s|gb\/s)$/);
  if (!s || !v) return null;
  const bytes = Number(s[1]) * SIZE[s[2]], bps = Number(v[1]) * SPEED[v[2]];
  if (!(bytes > 0 && bps > 0)) return null;
  return { bytes, bps, seconds: bytes * 8 / bps, real: bytes * 8 / (bps * 0.8), size: `${s[1]} ${s[2].toUpperCase().replace('IB', 'iB')}`, speed: `${v[1]} ${v[2]}` };
}
export const duration = s => { s = Math.round(s); if (s < 60) return `${s} s`; const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return [d && `${d} d`, h && `${h} h`, m && `${m} min`, !d && !h && x && `${x} s`].filter(Boolean).join(' '); };

export default function transferTime(jevie) {
  const { line, spread, stack, hero, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'transfer-time', label: 'Transfer time', symbol: 'arrow.down.circle', match: { pattern: PATTERN }, examples: ['download 50 gb at 100 mbps'],
    async render(said) {
      const r = transfer(said);
      if (!r) return { summary: 'Transfer time', complete: 0, body: [line(meta('Type a size and a speed: “download 50 gb at 100 mbps”'))] };
      const summary = `${duration(r.seconds)} for ${r.size} at ${r.speed} (about ${duration(r.real)} at a real 80%)`;
      return { summary, copy: duration(r.seconds), complete: 1, body: [spread(stack('leading', line(hero(duration(r.seconds))), line(chip('at full speed', 'arrow.down.circle'))), stack('trailing', line(hero(duration(r.real), true)), line(chip('at 80%')))), line(meta(`${r.size} at ${r.speed} · ${(r.bps / 8 / 1e6).toFixed(1)} MB a second · mbps is bits, MB/s bytes (8 bits)`))] };
    }
  });
}
