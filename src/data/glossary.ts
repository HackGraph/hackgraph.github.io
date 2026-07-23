/**
 * Beginner glossary: plain-English, one-line definitions for the security terms
 * and acronyms that pepper the technique prose. Surfaced as an on-demand hover /
 * tap tooltip in the detail panels (see components/GlossaryText.tsx), so the prose
 * stays terse and professional for practitioners while a newcomer can decode a
 * term without leaving the page.
 *
 * This is DOMAIN content (offensive-security vocabulary), so it lives in the data
 * layer, not the engine. Matching is CASE-SENSITIVE against `term` plus any
 * `aliases` (list the exact spellings/casings that appear in the corpus). Keep each
 * `short` to one plain sentence; no em-dashes in user-facing text.
 */
export interface GlossaryEntry {
  /** Canonical term, shown as the tooltip heading. */
  term: string;
  /** Extra spellings/casings/abbreviations that should also match (case-sensitive). */
  aliases?: string[];
  /** One-line plain-English definition. */
  short: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  // ── Kerberos ────────────────────────────────────────────────────────────────
  { term: 'Kerberos', short: "Windows' network authentication protocol, built on tickets issued by the domain controller." },
  { term: 'KDC', short: 'Key Distribution Center: the domain controller service that issues Kerberos tickets.' },
  { term: 'TGT', short: 'Ticket-Granting Ticket: your Kerberos master ticket, used to request tickets for individual services.' },
  { term: 'TGS', short: 'Ticket-Granting Service ticket: a Kerberos ticket for one specific service.' },
  { term: 'SPN', aliases: ['SPNs'], short: 'Service Principal Name: the identifier tying a service to the account running it, used to request its ticket.' },
  { term: 'Kerberoasting', aliases: ['Kerberoast'], short: "Request a service account's Kerberos ticket and crack it offline to recover that account's password." },
  { term: 'AS-REP roasting', aliases: ['AS-REP', 'AS-REP roast'], short: 'Crack the login response of an account that has Kerberos pre-authentication disabled, to recover its password.' },
  { term: 'PKINIT', short: 'The Kerberos extension that lets a certificate stand in for a password to obtain a ticket.' },
  { term: 'krbtgt', short: 'The hidden account whose key signs every Kerberos ticket in the domain; stealing it forges any ticket (a Golden Ticket).' },
  { term: 'Golden Ticket', short: 'A forged Kerberos TGT made with the stolen krbtgt key, granting access as anyone, indefinitely.' },
  { term: 'Silver Ticket', short: "A forged ticket for one service, made with that service account's key." },
  { term: 'S4U', short: "Kerberos 'Service for User' extensions (S4U2Self / S4U2Proxy) that let a service get tickets on a user's behalf; abused in delegation." },
  { term: 'ccache', short: 'A credential-cache file storing Kerberos tickets on Linux (pointed to by KRB5CCNAME).' },
  { term: 'keytab', aliases: ['keytabs'], short: "A file holding an account's Kerberos keys, usable to authenticate without the password." },

  // ── NTLM / authentication ────────────────────────────────────────────────────
  { term: 'NTLM', short: 'An older Windows challenge/response auth protocol; its password hash can be replayed without cracking (pass-the-hash).' },
  { term: 'NetNTLM', aliases: ['NetNTLMv2', 'NetNTLMv1'], short: 'The challenge/response hash sent during NTLM auth; crack it offline or relay it (not the same as the stored NT hash).' },
  { term: 'NT hash', short: 'The unsalted hash of a Windows password, stored locally and in AD; it can be replayed directly (pass-the-hash).' },
  { term: 'Pass-the-Hash', aliases: ['pass-the-hash', 'PtH'], short: "Authenticate with an account's NT hash directly, without knowing or cracking the password." },
  { term: 'Pass-the-Ticket', aliases: ['pass-the-ticket', 'PtT'], short: 'Reuse a stolen or forged Kerberos ticket to authenticate as that account.' },
  { term: 'Overpass-the-Hash', aliases: ['overpass-the-hash', 'OverPass-the-Hash', 'OPtH'], short: 'Turn an NT hash or key into a fresh Kerberos ticket (also called pass-the-key).' },
  { term: 'LLMNR', short: 'A Windows fallback name-resolution protocol that can be spoofed to capture authentication.' },
  { term: 'NBT-NS', aliases: ['NBNS'], short: 'NetBIOS Name Service: a legacy broadcast name-resolution protocol that can be spoofed to capture authentication.' },
  { term: 'mDNS', short: 'Multicast DNS: a local name-resolution protocol that, like LLMNR, can be spoofed to capture authentication.' },
  { term: 'WPAD', short: 'Web Proxy Auto-Discovery: how clients auto-find a proxy; spoofing it captures authentication.' },

  // ── Active Directory structure ────────────────────────────────────────────────
  { term: 'SID', short: 'Security Identifier: the unique ID Windows uses for an account, group, or computer.' },
  { term: 'RID', short: 'Relative Identifier: the tail of a SID; the well-known RID 500 is the built-in Administrator.' },
  { term: 'ACL', short: 'Access Control List: the set of permissions on an AD object or file.' },
  { term: 'ACE', aliases: ['ACEs'], short: "Access Control Entry: a single permission within an ACL (e.g. one account's GenericWrite over an object)." },
  { term: 'DACL', short: 'The part of an object security descriptor that grants or denies access; writing it grants yourself rights.' },
  { term: 'GPO', aliases: ['GPOs'], short: 'Group Policy Object: centrally-managed settings pushed to domain machines; controlling one can run code across them.' },
  { term: 'DCSync', short: 'Impersonate a domain controller to pull password hashes (including krbtgt) straight from AD via replication.' },
  { term: 'RBCD', short: 'Resource-Based Constrained Delegation: configure a computer you control so it can impersonate other users to a target.' },
  { term: 'gMSA', short: 'Group Managed Service Account: an account whose password AD manages and authorized principals can read.' },
  { term: 'dMSA', short: 'Delegated Managed Service Account (Server 2025); its migration feature can be abused to take over another account (BadSuccessor).' },
  { term: 'LAPS', short: "Local Administrator Password Solution: randomizes each machine's local admin password and stores it in AD." },
  { term: 'DPAPI', short: 'Data Protection API: how Windows encrypts saved secrets (browser passwords, credentials, keys); recoverable with the right keys.' },
  { term: 'LSASS', short: "The Windows process holding logged-on users' credentials in memory (hashes, tickets, sometimes plaintext)." },
  { term: 'LSA', short: 'Local Security Authority: the Windows component that handles authentication and stores secrets (LSA secrets).' },
  { term: 'SAM', short: "Security Account Manager: the local database of a Windows host's own account password hashes." },
  { term: 'NTDS', aliases: ['ntds.dit', 'NTDS.dit'], short: 'The Active Directory database file on a domain controller, holding every domain account password hash.' },
  { term: 'UPN', short: 'User Principal Name: an account login in email form (user@domain).' },
  { term: 'OU', short: 'Organizational Unit: an AD container for objects; rights over an OU can cascade to everything inside it.' },
  { term: 'DC', short: 'Domain Controller: a server running Active Directory that authenticates the domain.' },
  { term: 'DA', short: 'Domain Admin: full administrative control over the domain.' },

  // ── AD Certificate Services ──────────────────────────────────────────────────
  { term: 'AD CS', aliases: ['ADCS'], short: "Active Directory Certificate Services: Microsoft's PKI; misconfigured templates (ESC1-16) can mint a login certificate as anyone." },
  { term: 'NTAuth', short: "The AD store of CAs trusted for logon; writing to it makes your own CA's certificates valid for authentication." },

  // ── Windows privilege escalation ─────────────────────────────────────────────
  { term: 'UAC', short: 'User Account Control: the Windows split-token model that holds an admin at reduced rights until they consent to elevate.' },
  { term: 'SYSTEM', aliases: ['NT AUTHORITY\\SYSTEM'], short: 'The highest local Windows account, with full control of the machine.' },
  { term: 'HVCI', short: 'Hypervisor-protected Code Integrity (Memory Integrity): a Windows feature that blocks unsigned or vulnerable drivers from loading.' },
  { term: 'WDAC', short: 'Windows Defender Application Control: a policy that only lets approved code run.' },
  { term: 'AMSI', short: 'Antimalware Scan Interface: the hook that lets Defender scan scripts and in-memory code as they run.' },
  { term: 'LOLBIN', aliases: ['LOLBin', 'LOLBins', 'LOLBAS'], short: 'Living-off-the-land binary: a trusted, signed Windows tool (e.g. MSBuild) abused to run your code.' },
  { term: 'BYOVD', short: 'Bring Your Own Vulnerable Driver: load a legitimately-signed but buggy driver, then exploit it for kernel-level control.' },
  { term: 'SeImpersonatePrivilege', short: "A Windows token right that lets a service impersonate its callers; the basis of 'Potato' escalations to SYSTEM." },
  { term: 'Potato', short: 'A family of exploits that abuse SeImpersonatePrivilege to escalate a service account to SYSTEM.' },

  // ── Protocols ────────────────────────────────────────────────────────────────
  { term: 'SMB', short: 'Server Message Block: the Windows file-sharing and remote-admin protocol (port 445).' },
  { term: 'LDAP', aliases: ['LDAPS'], short: 'Lightweight Directory Access Protocol: how you query and modify Active Directory.' },
  { term: 'WinRM', short: 'Windows Remote Management: PowerShell remoting over HTTP(S), ports 5985/5986.' },
  { term: 'RDP', short: 'Remote Desktop Protocol: interactive graphical logon to a Windows host (port 3389).' },
  { term: 'WMI', short: 'Windows Management Instrumentation: a management interface often used to run commands remotely.' },
  { term: 'DCOM', short: 'Distributed COM: a Windows object protocol that can be abused for remote code execution.' },
  { term: 'RPC', short: 'Remote Procedure Call: the mechanism many Windows services expose; some can be abused remotely.' },

  // ── Relay / coercion ─────────────────────────────────────────────────────────
  { term: 'NTLM relay', short: 'Forward captured NTLM authentication to another service and act as the victim, without cracking anything.' },
  { term: 'coercion', aliases: ['coerce', 'coerced'], short: 'Force a machine (often a domain controller) to authenticate to you, so its credentials can be captured or relayed.' },
  { term: 'EPA', short: 'Extended Protection for Authentication (channel binding): ties auth to the TLS channel, blocking many relay attacks.' },
  { term: 'channel binding', short: 'Binds authentication to the specific TLS connection, so a relayed session is rejected.' },
  { term: 'SMB signing', short: 'Cryptographically signs SMB messages; when required, it blocks SMB relay attacks.' },

  // ── General ──────────────────────────────────────────────────────────────────
  { term: 'MITM', aliases: ['man-in-the-middle'], short: 'Man-in-the-middle: sit between two parties on the network to read or alter their traffic.' },
  { term: 'ARP', short: 'Address Resolution Protocol: maps IPs to hardware addresses on a local network; it has no authentication, so replies can be spoofed.' },
  { term: 'EDR', short: 'Endpoint Detection and Response: security software that watches for and flags malicious activity on a host.' },
  { term: 'C2', short: "Command and Control: the attacker's channel for remotely operating a compromised host." },
  { term: 'BloodHound', short: 'A tool that maps Active Directory relationships to find attack paths to Domain Admin.' },
  { term: 'tier-0', aliases: ['tier 0'], short: 'The most privileged assets (domain controllers, Domain Admins); compromising one means owning the domain.' },
];

// ── Tokenizer (pure, unit-testable; no DOM) ────────────────────────────────────

export type GlossarySegment =
  | { type: 'text'; value: string }
  | { type: 'term'; value: string; term: string; def: string };

interface Matchable {
  s: string;
  entry: GlossaryEntry;
}

/** All matchable strings (canonical + aliases), sorted LONGEST first so the regex
 *  alternation prefers the longest match at a given position. Built once. */
const MATCHABLES: Matchable[] = GLOSSARY.flatMap((entry) =>
  [entry.term, ...(entry.aliases ?? [])].map((s) => ({ s, entry })),
).sort((a, b) => b.s.length - a.s.length);

const LOOKUP = new Map<string, GlossaryEntry>(MATCHABLES.map((m) => [m.s, m.entry]));

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TERM_RE = new RegExp(MATCHABLES.map((m) => escapeRe(m.s)).join('|'), 'g');

const isWordChar = (ch: string) => /[A-Za-z0-9]/.test(ch);

/**
 * Split `text` into plain-text and glossary-term segments. A term matches only on a
 * non-alphanumeric boundary (so "SID" never matches inside "consider" and "LDAP"
 * never matches inside "LDAPS"), and each glossary entry is wrapped at most ONCE per
 * call (its first occurrence), to keep the prose from turning into a field of
 * underlines. Returns plain text as a single segment when nothing matches.
 */
export function tokenizeGlossary(text: string): GlossarySegment[] {
  if (!text) return [{ type: 'text', value: text }];
  const out: GlossarySegment[] = [];
  const used = new Set<string>();
  let last = 0;
  TERM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TERM_RE.exec(text)) !== null) {
    const str = m[0];
    const start = m.index;
    const end = start + str.length;
    const before = start > 0 ? text[start - 1] : '';
    const after = end < text.length ? text[end] : '';
    const entry = LOOKUP.get(str);
    // Skip: partial-word match, unknown, or this entry already wrapped once.
    if (!entry || isWordChar(before) || isWordChar(after) || used.has(entry.term)) continue;
    used.add(entry.term);
    if (start > last) out.push({ type: 'text', value: text.slice(last, start) });
    out.push({ type: 'term', value: str, term: entry.term, def: entry.short });
    last = end;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}
