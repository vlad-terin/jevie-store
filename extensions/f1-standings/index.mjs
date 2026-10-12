// The Formula 1 championship as a card while it is typed: Jolpica's F1 API
// (Ergast's successor), no key, kept an hour.
//
//   "f1 standings", "f1 drivers", "f1 constructors", "formula 1 standings"

export const PATTERN = '^(?:f1|formula\\s*1|formula\\s+one)(?:\\s+(?:standings|drivers?|championship|constructors?|teams?))?(?:\\s+standings)?$';

export function read(json, teams) {
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0];
  if (!list) return null;
  const rows = (teams ? list.ConstructorStandings : list.DriverStandings) ?? [];
  return { season: list.season, round: list.round, rows: rows.slice(0, 5).map(s => ({ position: Number(s.position), points: Number(s.points), wins: Number(s.wins),
    name: teams ? s.Constructor.name : `${s.Driver.givenName} ${s.Driver.familyName}`, team: teams ? null : s.Constructors?.at(-1)?.name ?? null })) };
}

export function cardOf(s, teams, P) {
  const { line, spread, stack, hero, chip, meta, title, list } = P;
  const [first, second] = s.rows;
  const gap = second ? first.points - second.points : null;
  const summary = `F1 ${s.season} after round ${s.round}: ${first.name} leads with ${first.points}${gap !== null ? ` (+${gap})` : ''}`;
  return { summary, copy: [summary, ...s.rows.map(r => `${r.position}. ${r.name} ${r.points}`)].join('\n'), complete: 1, body: [
    spread(stack('leading', line(title(first.name)), line(meta(teams ? `${first.wins} wins` : `${first.team ?? ''} · ${first.wins} wins`))),
      stack('trailing', line(hero(String(first.points))), line(chip(gap !== null ? `+${gap} ahead` : 'leads', 'flag.checkered')))),
    list(s.rows.slice(1).map(r => `${r.position}. ${r.name}${r.team ? ` (${r.team})` : ''} · ${r.points}`)),
    line(meta(`${teams ? 'Constructors' : 'Drivers'} · ${s.season} · after round ${s.round}`))
  ] };
}

export default function f1Standings(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'F1 standings', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  jevie.registerCard({
    name: 'f1', label: 'F1 standings', symbol: 'flag.checkered', match: { pattern: PATTERN }, examples: ['f1 standings', 'f1 constructors'],
    async render(said) {
      const teams = /\b(?:constructors?|teams?)\b/i.test(said);
      const key = teams ? 'constructors' : 'drivers';
      const kept = (await context.state.get(key).catch(() => null));
      if (kept && Date.now() - kept.at < 3600_000) return cardOf(kept.s, teams, P);
      const json = await fetch(`https://api.jolpi.ca/ergast/f1/current/${teams ? 'constructorStandings' : 'driverStandings'}.json`, { signal: AbortSignal.timeout(7000) }).then(r => r.ok ? r.json() : null).catch(() => null);
      const s = read(json, teams);
      if (!s?.rows.length) return note('No standings yet for this season', true);
      await context.state.set(key, { at: Date.now(), s }).catch(() => {});
      return cardOf(s, teams, P);
    }
  });
}
