import type { AttackEdge, TechniqueNodeDef } from '../schema';

const r = String.raw;
const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

/** AD CS certificate theft & persistence (Certipy THEFT/PERSIST families). */
export const adAdcsExtraNodes: TechniqueNodeDef[] = [
  {
    id: 'adcs-cert-theft',
    label: 'Certificate Theft (THEFT1-5)',
    phase: 'credential-access',
    summary: "Steal client-auth certificates + private keys from a compromised host's stores or disk, then PKINIT as the owner.",
    description:
      "On a host you control, harvest existing client-authentication certificates and their private keys: export them from the user/machine certificate store via CryptoAPI/CNG (THEFT1), decrypt them from the DPAPI-protected store with the user's masterkey or as SYSTEM (THEFT2/3), find PFX files left on disk (THEFT4), or recover one via PKINIT / NGC key material (THEFT5). A stolen client-auth cert is then used with PKINIT to obtain the owner's TGT (and NT hash via UnPAC) — access that survives password resets.",
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'SharpDPAPI (certificates)', url: 'https://github.com/GhostPack/SharpDPAPI' },
      { name: 'mimikatz (crypto::)', url: 'https://github.com/gentilkiwi/mimikatz' },
    ],
    commands: [
      { label: 'Export machine certs + keys (SharpDPAPI)', code: r`SharpDPAPI.exe certificates /machine`, lang: 'cmd' },
      { label: 'Export from the cert store (mimikatz)', code: r`crypto::certificates /systemstore:CERT_SYSTEM_STORE_LOCAL_MACHINE /export`, lang: 'powershell' },
      { label: 'Authenticate with the stolen cert (PKINIT)', code: r`certipy-ad auth -pfx stolen.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks — AD CS Certificate Theft', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/certificate-theft.html' },
      { label: 'SpecterOps — Certified Pre-Owned (Certificate Theft)', url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2' },
      { label: 'The Hacker Recipes — Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
    ],
    requires: ['Local admin / the target user context on a host holding a client-auth certificate'],
    opsec: 'Reading the cert store / DPAPI masterkeys is quieter than touching LSASS; the loud part is PKINIT auth with the stolen cert. Certs survive password resets, so theft doubles as stealthy persistence.',
    difficulty: 'medium',
  },
  {
    id: 'adcs-cert-persist',
    label: 'Certificate Persistence (PERSIST1-3)',
    phase: 'persistence',
    summary: 'Enroll a client-auth certificate for a compromised account — valid ~1 year and surviving password resets.',
    description:
      "Once you control an account (user or machine), enroll a client-authentication certificate for it (PERSIST1), for another user via an enrollment-agent cert (PERSIST2), or renew an existing one. Because certificates authenticate via PKINIT independently of the password, the cert keeps working for its full validity (often a year or more) even after the account's password is reset — quiet, durable persistence that most credential-rotation playbooks miss.",
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'Certify (GhostPack)', url: 'https://github.com/GhostPack/Certify' },
    ],
    commands: [
      { label: 'Enroll a client-auth cert for the current user', code: r`certipy-ad req -u user@corp.local -p PASS -ca CORP-CA -template User`, lang: 'bash' },
      { label: 'Later: authenticate with the cert (PKINIT)', code: r`certipy-ad auth -pfx user.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks — AD CS Account Persistence', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/account-persistence.html' },
      { label: 'SpecterOps — Certified Pre-Owned (Persistence)', url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2' },
      { label: 'The Hacker Recipes — Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
    ],
    requires: ['Control of the target account', 'Enrollment rights to a client-auth template'],
    opsec: 'Enrollment is logged (4886/4887) but blends with normal PKI activity; the cert then authenticates without further enrollment, surviving password changes. Evicting requires revoking the cert, not just resetting the password.',
    difficulty: 'medium',
  },
];

export const adAdcsExtraEdges: AttackEdge[] = [
  { source: 'ad-cat-user-secrets', target: 'adcs-cert-theft' },
  { source: 'adcs-cert-theft', target: 'pass-the-certificate', label: 'PKINIT as owner' },
  { source: 'ad-cat-persistence', target: 'adcs-cert-persist' },
  { source: 'adcs-cert-persist', target: 'pass-the-certificate', label: 'durable PKINIT' },
];
