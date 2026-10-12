// Linear: "linear issues" lists what is assigned to you and still open;
// "linear issue onboarding" searches by words. Return opens the issue, ⌘C
// copies its address. Read-only - nothing is created or changed - a lean
// port of Raycast's Linear extension. The key is yours alone, typed once
// into "settings for linear" and kept in the Keychain. "linear" bare stays
// the application's.

const API = 'https://api.linear.app/graphql';

const FIELDS = 'identifier title url updatedAt state { name } assignee { displayName }';
export const MINE = `query { viewer { assignedIssues(first: 20, orderBy: updatedAt, filter: { state: { type: { nin: ["completed", "canceled"] } } }) { nodes { ${FIELDS} } } } }`;
export const SEARCH = `query Search($q: String!) { searchIssues(term: $q, first: 15) { nodes { ${FIELDS} } } }`;

/// The GraphQL answer as rows' data, either query.
export function parseIssues(json) {
  const nodes = json?.data?.viewer?.assignedIssues?.nodes ?? json?.data?.searchIssues?.nodes ?? [];
  return nodes.map(issue => ({ key: issue.identifier, title: issue.title, state: issue.state?.name ?? '',
    who: issue.assignee?.displayName ?? '', url: issue.url, updated: issue.updatedAt }));
}

async function ask(key, query, variables = {}) {
  const response = await fetch(API, { method: 'POST', signal: AbortSignal.timeout(10_000),
    headers: { 'content-type': 'application/json', authorization: key },
    body: JSON.stringify({ query, variables }) });
  if (response.status === 401 || response.status === 400) throw new Error('key');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = await response.json();
  if (json.errors?.length) throw new Error(json.errors[0].message ?? 'GraphQL error');
  return json;
}

export default function linear(jevie, context) {
  const { List, Action, command } = jevie;
  jevie.registerSurface(command({
    names: ['linear issues', 'my linear issues', 'linear issue', 'linear search'],
    what: 'your Linear issues',
    examples: ['linear issues', 'linear issue onboarding'],
    reversible: true,
    async run(text) {
      const key = String(context?.preferences?.apiKey ?? '').trim();
      const query = String(text ?? '').trim();
      try {
        const json = await ask(key, query ? SEARCH : MINE, query ? { q: query } : {});
        return List({ title: query ? `Linear · ${query}` : 'Linear · assigned to you', empty: query ? `Nothing for ${query}` : 'Nothing assigned and open.',
          items: parseIssues(json).map(issue => ({ title: `${issue.key} ${issue.title}`, subtitle: issue.state, icon: 'circle.hexagongrid',
            accessory: issue.updated?.slice(0, 10) ?? '', actions: [Action.OpenInBrowser(issue.url), Action.CopyToClipboard(issue.url)] })) });
      } catch (error) {
        if (error.message === 'key') return { status: 'needs-help', spoken: 'Linear refused the key.', lines: [{ title: 'Linear refused the key', subtitle: 'set a personal API key in "settings for linear"' }] };
        return { status: 'needs-help', spoken: 'Linear did not answer.', lines: [{ title: 'Linear did not answer', subtitle: String(error.message).slice(0, 120) }] };
      }
    }
  }));
}
