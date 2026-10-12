// Production sums, as cards while they are typed, worked out on this Mac:
//
//   "video size 10 min at 8 mbps", "video 45 min 4k"     bitrate × time (and YouTube's recommended bitrates by resolution)
//   "speaking time 1500 words", "script 900 words at 160 wpm"   minutes at 150 words a minute unless named
//   "print size 6000x4000 at 300 dpi", "print 4032x3024"  inches and centimetres at a resolution (300 dpi unless named)

export const VIDEO = '^video(?:\\s+(?:file\\s+)?size)?\\s+[\\d.]+\\s*(?:min(?:utes?)?|h(?:ours?)?|s(?:ec(?:onds?)?)?)\\s+(?:at\\s+[\\d.]+\\s*(?:mbps|kbps|mb/s)|720p|1080p|1440p|4k|2160p)$';
export const SPEAK = '^(?:speaking|reading\\s+aloud|talk|script|speech)(?:\\s+time)?\\s+[\\d,]+\\s*words(?:\\s+at\\s+\\d+\\s*wpm)?$';
export const PRINT = '^print(?:\\s+size)?\\s+\\d{3,5}\\s*x\\s*\\d{3,5}(?:\\s+at\\s+\\d{2,4}\\s*(?:dpi|ppi))?$';
const RATES = { '720p': 5, '1080p': 8, '1440p': 16, '4k': 45, '2160p': 45 };

export function video(said) {
  const t = String(said).toLowerCase();
  const d = t.match(/([\d.]+)\s*(min(?:utes?)?|h(?:ours?)?|s(?:ec(?:onds?)?)?)/);
  const seconds = Number(d[1]) * (/^h/.test(d[2]) ? 3600 : /^s/.test(d[2]) ? 1 : 60);
  const res = Object.keys(RATES).find(k => t.includes(k));
  const r = t.match(/([\d.]+)\s*(mbps|kbps|mb\/s)/);
  const mbps = r ? (r[2] === 'kbps' ? Number(r[1]) / 1000 : r[2] === 'mb/s' ? Number(r[1]) * 8 : Number(r[1])) : RATES[res];
  if (!(seconds > 0 && mbps > 0)) return null;
  const megabytes = mbps * seconds / 8;
  return { seconds, mbps, res, megabytes, perMinute: mbps * 60 / 8 };
}
export function speak(said) { const t = String(said).toLowerCase(); const words = Number(t.match(/([\d,]+)\s*words/)[1].replace(/,/g, '')); const wpm = Number(t.match(/(\d+)\s*wpm/)?.[1] ?? 150); return words > 0 ? { words, wpm, minutes: words / wpm } : null; }
export function print(said) {
  const t = String(said).toLowerCase(); const m = t.match(/(\d{3,5})\s*x\s*(\d{3,5})/); const dpi = Number(t.match(/at\s+(\d{2,4})/)?.[1] ?? 300);
  const w = Number(m[1]), h = Number(m[2]);
  return { w, h, dpi, inW: w / dpi, inH: h / dpi, mp: w * h / 1e6, at150: [w / 150, h / 150] };
}
const size = mb => mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;
const mmss = m => { const s = Math.round((m % 1) * 60); return `${Math.floor(m)} min${s ? ` ${s} s` : ''}`; };

export default function mediaMath(jevie) {
  const { line, spread, pair, stack, hero, chip, meta, icon } = jevie.CardParts;
  jevie.registerCard({
    name: 'video-size', label: 'Video size', symbol: 'film', match: { pattern: VIDEO }, examples: ['video size 10 min at 8 mbps'],
    async render(said) {
      const v = video(said);
      if (!v) return { summary: 'Video size', complete: 0, body: [line(meta('Type a length and a bitrate or resolution: “video size 10 min at 8 mbps”'))] };
      const summary = `${size(v.megabytes)} for ${mmss(v.seconds / 60)} at ${v.mbps} Mbps${v.res ? ` (${v.res})` : ''}`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(size(v.megabytes))), line(chip(`${v.mbps} Mbps${v.res ? ` · ${v.res}` : ''}`, 'film'))), stack('trailing', line(meta(mmss(v.seconds / 60))), line(meta(`${size(v.perMinute)} a minute`)))), line(meta(v.res && !/mbps|kbps|mb\/s/.test(said.toLowerCase()) ? 'at YouTube\'s recommended SDR upload bitrate for that resolution, 30 fps · audio not counted' : 'video bitrate × time · audio adds a little (≈ 1 MB a minute at 128 kbps)'))] };
    }
  });
  jevie.registerCard({
    name: 'speaking-time', label: 'Speaking time', symbol: 'mic', match: { pattern: SPEAK }, examples: ['speaking time 1500 words'],
    async render(said) {
      const s = speak(said);
      if (!s) return { summary: 'Speaking time', complete: 0, body: [line(meta('Type a word count: “speaking time 1500 words”'))] };
      const summary = `${mmss(s.minutes)} to say ${s.words.toLocaleString('en-US')} words at ${s.wpm} wpm`;
      return { summary, copy: summary, complete: 1, body: [spread(stack('leading', line(hero(mmss(s.minutes))), line(chip(`at ${s.wpm} words a minute`, 'mic'))), stack('trailing', line(meta(`slow 130 wpm: ${mmss(s.words / 130)}`)), line(meta(`fast 170 wpm: ${mmss(s.words / 170)}`)))), line(meta('presentations and podcasts run about 130–160 wpm; audiobooks about 150'))] };
    }
  });
  jevie.registerCard({
    name: 'print-size', label: 'Print size', symbol: 'printer', match: { pattern: PRINT }, examples: ['print size 6000x4000 at 300 dpi'],
    async render(said) {
      const p = print(said);
      const summary = `${p.w}×${p.h} prints ${p.inW.toFixed(1)}×${p.inH.toFixed(1)} in (${(p.inW * 2.54).toFixed(1)}×${(p.inH * 2.54).toFixed(1)} cm) at ${p.dpi} dpi`;
      return { summary, copy: summary, complete: 1, body: [pair(stack('leading', line(hero(`${p.inW.toFixed(1)}×${p.inH.toFixed(1)} in`)), line(chip(`at ${p.dpi} dpi`, 'printer'))), icon('equal'), stack('trailing', line(hero(`${(p.inW * 2.54).toFixed(1)}×${(p.inH * 2.54).toFixed(1)} cm`, true)), line(chip(`${p.mp.toFixed(1)} MP`)))), line(meta(`300 dpi is photo quality held in the hand; at 150 dpi for a wall print: ${p.at150[0].toFixed(1)}×${p.at150[1].toFixed(1)} in`))] };
    }
  });
}
