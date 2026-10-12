// The time anywhere: "time in tokyo" answers for a city, a country or an
// IANA zone; "world clock" lays out the usual places around your own. ⌘C
// copies the line. All from the system's own zone data - no network.

const CITIES = {
  'san francisco': 'America/Los_Angeles', 'los angeles': 'America/Los_Angeles', seattle: 'America/Los_Angeles',
  denver: 'America/Denver', chicago: 'America/Chicago', dallas: 'America/Chicago', austin: 'America/Chicago', houston: 'America/Chicago',
  'new york': 'America/New_York', nyc: 'America/New_York', boston: 'America/New_York', miami: 'America/New_York', toronto: 'America/Toronto',
  'mexico city': 'America/Mexico_City', 'sao paulo': 'America/Sao_Paulo', 'buenos aires': 'America/Argentina/Buenos_Aires',
  london: 'Europe/London', uk: 'Europe/London', dublin: 'Europe/Dublin', lisbon: 'Europe/Lisbon',
  paris: 'Europe/Paris', france: 'Europe/Paris', berlin: 'Europe/Berlin', germany: 'Europe/Berlin', munich: 'Europe/Berlin',
  amsterdam: 'Europe/Amsterdam', madrid: 'Europe/Madrid', spain: 'Europe/Madrid', rome: 'Europe/Rome', italy: 'Europe/Rome',
  zurich: 'Europe/Zurich', stockholm: 'Europe/Stockholm', warsaw: 'Europe/Warsaw', kyiv: 'Europe/Kyiv', kiev: 'Europe/Kyiv',
  moscow: 'Europe/Moscow', russia: 'Europe/Moscow', istanbul: 'Europe/Istanbul', turkey: 'Europe/Istanbul',
  dubai: 'Asia/Dubai', uae: 'Asia/Dubai', 'tel aviv': 'Asia/Jerusalem', israel: 'Asia/Jerusalem',
  mumbai: 'Asia/Kolkata', delhi: 'Asia/Kolkata', india: 'Asia/Kolkata', bangalore: 'Asia/Kolkata',
  singapore: 'Asia/Singapore', 'hong kong': 'Asia/Hong_Kong', shanghai: 'Asia/Shanghai', beijing: 'Asia/Shanghai', china: 'Asia/Shanghai',
  seoul: 'Asia/Seoul', korea: 'Asia/Seoul', tokyo: 'Asia/Tokyo', japan: 'Asia/Tokyo', taipei: 'Asia/Taipei', bangkok: 'Asia/Bangkok',
  jakarta: 'Asia/Jakarta', manila: 'Asia/Manila', sydney: 'Australia/Sydney', australia: 'Australia/Sydney',
  melbourne: 'Australia/Melbourne', auckland: 'Pacific/Auckland', 'new zealand': 'Pacific/Auckland',
  honolulu: 'Pacific/Honolulu', hawaii: 'Pacific/Honolulu', anchorage: 'America/Anchorage', utc: 'UTC', gmt: 'UTC'
};

/// The zone a query names: a known city or country, or an IANA name the
/// system recognises ("Europe/Oslo"); null when neither.
export function zoneFor(query) {
  const said = String(query ?? '').trim().toLowerCase().replace(/[?.!]+$/, '');
  if (CITIES[said]) return { zone: CITIES[said], name: said.replace(/\b\w/g, c => c.toUpperCase()) };
  const iana = said.replace(/\s+/g, '_').replace(/(^|\/)(\w)/g, (_, a, b) => a + b.toUpperCase());
  try { new Date().toLocaleString('en-US', { timeZone: iana }); return { zone: iana, name: iana.split('/').pop().replace(/_/g, ' ') }; }
  catch { return null; }
}

/// One place's line: its clock, day, and hours ahead of or behind here.
export function timeRow(zone, name, now = new Date(), home = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const time = now.toLocaleTimeString('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit' });
  const day = now.toLocaleDateString('en-US', { timeZone: zone, weekday: 'short' });
  const offsetOf = tz => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(now);
    const gmt = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+00:00';
    const m = gmt.match(/GMT([+-])(\d{2}):(\d{2})/);
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  };
  const diff = (offsetOf(zone) - offsetOf(home)) / 60;
  const apart = diff === 0 ? 'same time as here' : `${Math.abs(diff) % 1 ? Math.abs(diff) : Math.abs(diff)}h ${diff > 0 ? 'ahead' : 'behind'}`;
  return { name, time, day, apart, line: `${name}: ${time} ${day} (${apart})` };
}

const USUAL = [['San Francisco', 'America/Los_Angeles'], ['New York', 'America/New_York'], ['London', 'Europe/London'],
  ['Berlin', 'Europe/Berlin'], ['Moscow', 'Europe/Moscow'], ['Dubai', 'Asia/Dubai'], ['Tokyo', 'Asia/Tokyo'], ['Sydney', 'Australia/Sydney']];

export default function worldClock(jevie) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['time in', 'world clock', 'what time is it in'],
    what: 'the time anywhere',
    examples: ['time in tokyo', 'world clock'],
    reversible: true,
    async run(text) {
      const query = String(text ?? '').trim();
      if (query) {
        const found = zoneFor(query);
        if (!found) return { status: 'ok', spoken: `I don't know the zone for ${query}.`, lines: [{ title: `No timezone for "${query}"`, subtitle: 'a city (tokyo), a country (japan), or an IANA name (Asia/Tokyo)' }] };
        const row = timeRow(found.zone, found.name);
        return List({ title: 'Time', spoken: row.line,
          items: [{ title: `${row.time} ${row.day}`, subtitle: `${row.name} · ${row.apart}`, icon: 'clock', actions: [Action.CopyToClipboard(row.line)] }] });
      }
      const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const rows = [timeRow(here, 'Here'), ...USUAL.filter(([, zone]) => zone !== here).map(([name, zone]) => timeRow(zone, name))];
      return List({ title: 'World clock', items: rows.map(row => ({ title: row.time, subtitle: `${row.name} · ${row.day} · ${row.apart}`, icon: 'globe', actions: [Action.CopyToClipboard(row.line)] })) });
    }
  }));
}
