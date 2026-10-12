# Email Setup

Who runs a domain's email and whether it is set up to be trusted, as a card while you type: the provider, SPF, DMARC and DKIM.

## Type

- “email setup github.com”
- “dmarc stripe.com”
- “spf example.org”
- “mx acme.com”

The provider comes from the MX records (Google Workspace, Microsoft 365, Proofpoint, Mimecast and others). SPF shows whether it ends strict (-all), soft (~all) or open. DMARC shows its policy (none, quarantine, reject). DKIM is looked for at the common selectors (google, selector1, selector2, …), so a key at another selector is not seen. ↵ copies the records.

## Reaches

The DNS servers your Mac uses. It changes nothing.
