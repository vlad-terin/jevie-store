// Is a service down, as a card while it is typed: its own status page's
// API (Atlassian Statuspage, which most of them use), no key, kept a minute.
//
//   "is github down", "status openai", "vercel status", "is slack up"
//
// A service not listed is tried at status.<name>.com.

export const PAGES = {
  github: 'www.githubstatus.com', openai: 'status.openai.com', chatgpt: 'status.openai.com', anthropic: 'status.anthropic.com', claude: 'status.anthropic.com',
  vercel: 'www.vercel-status.com', cloudflare: 'www.cloudflarestatus.com', discord: 'discordstatus.com', npm: 'status.npmjs.org', netlify: 'www.netlifystatus.com',
  atlassian: 'status.atlassian.com', jira: 'jira-software.status.atlassian.com', confluence: 'confluence.status.atlassian.com', bitbucket: 'bitbucket.status.atlassian.com',
  reddit: 'www.redditstatus.com', dropbox: 'status.dropbox.com', zoom: 'status.zoom.us', linear: 'linearstatus.com', figma: 'status.figma.com',
  digitalocean: 'status.digitalocean.com', twilio: 'status.twilio.com', datadog: 'status.datadoghq.com', supabase: 'status.supabase.com', sentry: 'status.sentry.io',
  heroku: 'status.heroku.com', render: 'status.render.com', fly: 'status.flyio.net', railway: 'status.railway.com', cursor: 'status.cursor.com', notion: 'www.notion-status.com',
  hubspot: 'status.hubspot.com', shopify: 'www.shopifystatus.com', twitch: 'status.twitch.tv', mongodb: 'status.mongodb.com', docker: 'www.dockerstatus.com', circleci: 'status.circleci.com'
};
// "is <anything> down" for any service; "status X" and "X status" only for
// the ones listed - "git status", "order status" are not a status page.
const KNOWN = Object.keys(PAGES).join('|');
export const PATTERN = `^(?:is\\s+[a-z0-9.-]{2,30}\\s+(?:down|up|working|out)\\??|status\\s+(?:of\\s+)?(?:${KNOWN})|(?:${KNOWN})\\s+status)$`;

export function serviceIn(said) {
  const t = String(said).trim().toLowerCase().replace(/\?$/, '');
  return (t.match(/^is\s+([a-z0-9.-]+)\s+(?:down|up|working|out)$/) ?? t.match(/^status\s+(?:of\s+)?([a-z0-9.-]+)$/) ?? t.match(/^([a-z0-9.-]+)\s+status$/))?.[1] ?? null;
}

const TONE = { none: ['All good', 'checkmark.circle'], minor: ['Minor trouble', 'exclamationmark.circle'], major: ['Major outage', 'exclamationmark.triangle'], critical: ['Critical outage', 'xmark.octagon'], maintenance: ['Maintenance', 'wrench'] };

export function cardOf(name, s, P) {
  const { line, spread, stack, hero, chip, meta, title, list } = P;
  const broken = (s.components ?? []).filter(c => c.status && c.status !== 'operational' && !c.group).slice(0, 5);
  const incidents = (s.incidents ?? []).slice(0, 2);
  const [word, symbol] = TONE[s.status?.indicator] ?? TONE.none;
  const down = s.status?.indicator && s.status.indicator !== 'none';
  const summary = `${s.page?.name ?? name}: ${s.status?.description ?? word}`;
  return { summary, copy: `${summary}${incidents[0] ? ` - ${incidents[0].name}` : ''} (${s.page?.url ?? ''})`, complete: 1, body: [
    spread(stack('leading', line(title(s.page?.name ?? name)), line(meta(s.status?.description ?? ''))), stack('trailing', line(hero(down ? 'Trouble' : 'Up', !down)), line(chip(word, symbol)))),
    ...(incidents.length ? [list(incidents.map(i => `${i.name} · ${i.status}`))] : []),
    ...(broken.length ? [line(meta(broken.map(c => `${c.name}: ${c.status.replace(/_/g, ' ')}`).join(' · ')))] : []),
    line(meta(`${s.page?.url ?? ''}${s.page?.updated_at ? ` · updated ${new Date(s.page.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}`))
  ] };
}

export default function serviceStatus(jevie, context) {
  const P = jevie.CardParts;
  const note = (t, error = false) => ({ summary: 'Service status', complete: 0, ...(error ? { error: true } : {}), body: [P.line(P.text(t, true))] });
  jevie.registerCard({
    name: 'status', label: 'Service status', symbol: 'waveform.path.ecg', match: { pattern: PATTERN }, examples: ['is github down', 'status openai'],
    async render(said) {
      const name = serviceIn(said);
      if (!name) return note('Type a service, like “is github down”');
      const host = PAGES[name] ?? (name.includes('.') ? `status.${name}` : `status.${name}.com`);
      const kept = (await context.state.get('status').catch(() => null)) ?? {};
      if (kept[host] && Date.now() - kept[host].at < 60_000) return cardOf(name, kept[host].s, P);
      const s = await fetch(`https://${host}/api/v2/summary.json`, { signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'Jevie/1.0' } }).then(r => r.ok ? r.json() : null).catch(() => null);
      if (!s?.status) return note(PAGES[name] ? `${name}'s status page did not answer` : `No status page found for ${name} (tried ${host})`, true);
      await context.state.set('status', Object.fromEntries([...Object.entries(kept), [host, { at: Date.now(), s: { page: s.page, status: s.status, incidents: s.incidents, components: s.components } }]].slice(-60))).catch(() => {});
      return cardOf(name, s, P);
    }
  });
}
