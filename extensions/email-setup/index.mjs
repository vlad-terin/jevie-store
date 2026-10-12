// A domain's email, as a card while it is typed, from the DNS (the Mac's own
// resolver): who receives its mail (Google Workspace, Microsoft 365, …),
// whether SPF and DMARC are published and how strict, and a DKIM key at the
// usual selectors. For a deliverability check, or to know a prospect's stack.
//
//   "email setup github.com", "dmarc stripe.com", "spf example.org", "mx acme.com"

import { promises as dns } from 'node:dns';

export const PATTERN = '^(?:email\\s+setup|mail\\s+setup|dmarc|spf|mx|email\\s+provider)\\s+(?:[a-z0-9-]+\\.)+[a-z]{2,}$';
export const PROVIDERS = [[/google\.com$|googlemail\.com$/, 'Google Workspace'], [/outlook\.com$|protection\.outlook\.com$/, 'Microsoft 365'], [/pphosted\.com$/, 'Proofpoint'],
  [/mimecast\.com$/, 'Mimecast'], [/zoho\./, 'Zoho Mail'], [/icloud\.com$/, 'iCloud Mail'], [/protonmail\.ch$/, 'Proton Mail'], [/yahoodns\.net$/, 'Yahoo'],
  [/mailgun\.org$/, 'Mailgun'], [/sendgrid\.net$/, 'SendGrid'], [/amazonaws\.com$/, 'Amazon SES'], [/fastmail\.com$|messagingengine\.com$/, 'Fastmail'], [/barracudanetworks\.com$/, 'Barracuda']];
const SELECTORS = ['google', 'selector1', 'selector2', 'default', 'k1', 's1', 'mail', 'dkim'];
const within = (p, ms = 3000) => Promise.race([p.catch(() => null), new Promise(done => setTimeout(() => done(null), ms))]);

export async function inspect(domain, resolver = dns) {
  const [mx, txt, dmarc] = await Promise.all([within(resolver.resolveMx(domain)), within(resolver.resolveTxt(domain)), within(resolver.resolveTxt(`_dmarc.${domain}`))]);
  const spf = (txt ?? []).map(t => t.join('')).find(t => /^v=spf1/i.test(t)) ?? null;
  const dmarcRecord = (dmarc ?? []).map(t => t.join('')).find(t => /^v=DMARC1/i.test(t)) ?? null;
  const keys = await Promise.all(SELECTORS.map(s => within(resolver.resolveTxt(`${s}._domainkey.${domain}`), 2000).then(r => (r ?? []).some(t => /p=/.test(t.join(''))) ? s : null)));
  const hosts = (mx ?? []).sort((a, b) => a.priority - b.priority).map(m => m.exchange.toLowerCase());
  const provider = PROVIDERS.find(([re]) => hosts.some(h => re.test(h)))?.[1] ?? (hosts[0] ? hosts[0].split('.').slice(-2).join('.') : null);
  return { hosts, provider, spf, spfAll: spf?.match(/([~\-?+])all\b/)?.[1] ?? null, dmarc: dmarcRecord, policy: dmarcRecord?.match(/\bp=(\w+)/i)?.[1]?.toLowerCase() ?? null, dkim: keys.filter(Boolean) };
}

export function cardOf(domain, e, P) {
  const { line, spread, stack, hero, chip, meta, title } = P;
  const spfWord = !e.spf ? 'no SPF' : e.spfAll === '-' ? 'SPF strict' : e.spfAll === '~' ? 'SPF soft' : 'SPF open';
  const dmarcWord = !e.dmarc ? 'no DMARC' : `DMARC ${e.policy ?? '?'}`;
  const good = [Boolean(e.spf), Boolean(e.dmarc && e.policy !== 'none'), e.dkim.length > 0].filter(Boolean).length;
  const summary = `${domain}: ${e.provider ?? 'no mail'} · ${spfWord} · ${dmarcWord} · ${e.dkim.length ? `DKIM (${e.dkim.join(', ')})` : 'DKIM not found'}`;
  return { summary, copy: [summary, e.spf && `SPF: ${e.spf}`, e.dmarc && `DMARC: ${e.dmarc}`].filter(Boolean).join('\n'), complete: 1, body: [
    spread(stack('leading', line(title(domain)), line(meta(e.provider ? `mail handled by ${e.provider}` : 'no MX records: it receives no mail'))), stack('trailing', line(hero(`${good}/3`, good < 3)), line(chip('trust checks', 'envelope.badge.shield.half.filled')))),
    line(chip(spfWord, e.spf ? 'checkmark' : 'xmark'), chip(dmarcWord, e.dmarc && e.policy !== 'none' ? 'checkmark' : 'xmark'), chip(e.dkim.length ? 'DKIM' : 'no DKIM found', e.dkim.length ? 'checkmark' : 'questionmark')),
    line(meta(`${e.hosts.slice(0, 2).join(' · ')}${e.dkim.length ? '' : ' · DKIM looked for at the common selectors only'}`))] };
}

export default function emailSetup(jevie) {
  const P = jevie.CardParts;
  jevie.registerCard({
    name: 'email-setup', label: 'Email setup', symbol: 'envelope.badge.shield.half.filled', match: { pattern: PATTERN }, examples: ['email setup github.com', 'dmarc stripe.com'],
    async render(said) {
      const domain = said.trim().toLowerCase().split(/\s+/).at(-1).replace(/^www\./, '');
      return cardOf(domain, await inspect(domain), P);
    }
  });
}
