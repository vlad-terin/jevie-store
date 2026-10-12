// MIME types, as a card while they are typed: a table of the common ones
// (IANA's registry and what browsers send), kept in this extension.
//
//   "mime webp", "mime type .docx", "content type for woff2", "mime application/json"

export const TYPES = {
  html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', jsonld: 'application/ld+json', map: 'application/json',
  xml: 'application/xml', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', tsv: 'text/tab-separated-values', ics: 'text/calendar', vcf: 'text/vcard', yaml: 'application/yaml', yml: 'application/yaml', toml: 'application/toml',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml', ico: 'image/vnd.microsoft.icon', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', heic: 'image/heic', heif: 'image/heif',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', opus: 'audio/opus', weba: 'audio/webm', mid: 'audio/midi', midi: 'audio/midi',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska', mpeg: 'video/mpeg', ogv: 'video/ogg', ts: 'video/mp2t', m3u8: 'application/vnd.apple.mpegurl',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
  pdf: 'application/pdf', zip: 'application/zip', gz: 'application/gzip', tgz: 'application/gzip', tar: 'application/x-tar', '7z': 'application/x-7z-compressed', rar: 'application/vnd.rar', bz2: 'application/x-bzip2', xz: 'application/x-xz',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet', rtf: 'application/rtf', epub: 'application/epub+zip',
  wasm: 'application/wasm', bin: 'application/octet-stream', exe: 'application/vnd.microsoft.portable-executable', dmg: 'application/x-apple-diskimage', apk: 'application/vnd.android.package-archive', jar: 'application/java-archive',
  sh: 'application/x-sh', php: 'application/x-httpd-php', webmanifest: 'application/manifest+json', glb: 'model/gltf-binary', gltf: 'model/gltf+json', usdz: 'model/vnd.usdz+zip', sql: 'application/sql', graphql: 'application/graphql'
};
export const PATTERN = '^(?:mime(?:\\s+type)?|content[\\s-]+type|media\\s+type)\\s+(?:of\\s+|for\\s+)?(?:\\.?[a-z0-9]{1,12}|[a-z]+/[a-z0-9.+-]+)$';
export function look(said) {
  const q = String(said).trim().toLowerCase().replace(/^(?:mime(?:\s+type)?|content[\s-]+type|media\s+type)\s+(?:of\s+|for\s+)?/, '').replace(/^\./, '');
  if (q.includes('/')) return { type: q, extensions: Object.entries(TYPES).filter(([, v]) => v === q).map(([k]) => k) };
  return { extension: q, type: TYPES[q] ?? null };
}

export default function mimeTypes(jevie) {
  const { line, spread, title, mono, chip, meta } = jevie.CardParts;
  jevie.registerCard({
    name: 'mime', label: 'MIME type', symbol: 'doc.badge.gearshape', match: { pattern: PATTERN }, examples: ['mime webp', 'mime application/json'],
    async render(said) {
      const r = look(said);
      if (r.extension) {
        if (!r.type) return { summary: 'MIME type', complete: 0, error: true, body: [line(meta(`.${r.extension} is not in the table · application/octet-stream is the safe default`))] };
        return { summary: `.${r.extension}: ${r.type}`, copy: r.type, complete: 1, body: [spread(title(`.${r.extension}`), chip(r.type.split('/')[0], 'doc.badge.gearshape')), line(mono(r.type)), line(meta(`Content-Type: ${r.type}${/^text\//.test(r.type) ? '; charset=utf-8' : ''} · ↵ copies it`))] };
      }
      if (!r.extensions.length) return { summary: 'MIME type', complete: 0, error: true, body: [line(meta(`${r.type} is not in the table`))] };
      return { summary: `${r.type}: ${r.extensions.map(e => `.${e}`).join(' ')}`, copy: r.extensions.map(e => `.${e}`).join(' '), complete: 1, body: [spread(title(r.type), chip(`${r.extensions.length} extension${r.extensions.length === 1 ? '' : 's'}`)), line(mono(r.extensions.map(e => `.${e}`).join('  ')))] };
    }
  });
}
