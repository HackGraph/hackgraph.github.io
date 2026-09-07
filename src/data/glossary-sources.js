// Original specifications, documentation and taxonomy descriptions for glossary definitions.
export const GLOSSARY_SOURCES = {
  "kerberos": {
    "label": "MIT: What is Kerberos?",
    "url": "https://web.mit.edu/kerberos/",
    "section": "What is Kerberos?",
    "kind": "primary"
  },
  "rfc4120": {
    "label": "RFC 4120: Kerberos V5",
    "url": "https://www.rfc-editor.org/rfc/rfc4120.html",
    "section": "Sections 1.1, 1.7 and 3.1: protocol, definitions and the authentication exchange",
    "kind": "primary"
  },
  "kdc": {
    "label": "Microsoft: Key Distribution Center",
    "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/key-distribution-center",
    "section": "Authentication service and ticket-granting service",
    "kind": "primary"
  },
  "spn": {
    "label": "Microsoft: Service principal names",
    "url": "https://learn.microsoft.com/en-us/windows/win32/ad/service-principal-names",
    "section": "Service principal names",
    "kind": "primary"
  },
  "pkinit": {
    "label": "RFC 4556: PKINIT",
    "url": "https://www.rfc-editor.org/rfc/rfc4556.html",
    "section": "Section 1: Introduction",
    "kind": "primary"
  },
  "accounts": {
    "label": "Microsoft: Privileged accounts and groups",
    "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory",
    "section": "Krbtgt and Domain Admins",
    "kind": "primary"
  },
  "delegation": {
    "label": "Microsoft: Kerberos constrained delegation",
    "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview",
    "section": "Resource-based constrained delegation and S4U extensions",
    "kind": "primary"
  },
  "ccache": {
    "label": "MIT: Credential cache",
    "url": "https://web.mit.edu/kerberos/krb5-latest/doc/basic/ccache_def.html",
    "section": "Credential cache; ccache types",
    "kind": "primary"
  },
  "keytab": {
    "label": "MIT: Keytab",
    "url": "https://web.mit.edu/kerberos/krb5-latest/doc/basic/keytab_def.html",
    "section": "Keytab",
    "kind": "primary"
  },
  "ntlm": {
    "label": "Microsoft: NTLM",
    "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/microsoft-ntlm",
    "section": "NTLM authentication",
    "kind": "primary"
  },
  "nthash": {
    "label": "Microsoft: Passwords technical overview",
    "url": "https://learn.microsoft.com/en-us/windows-server/security/kerberos/passwords-technical-overview",
    "section": "Passwords stored as OWF; Passwords stored in Active Directory",
    "kind": "primary"
  },
  "llmnr": {
    "label": "RFC 4795: LLMNR",
    "url": "https://www.rfc-editor.org/rfc/rfc4795.html",
    "section": "Sections 1 and 2: Introduction and name resolution",
    "kind": "primary"
  },
  "nbns": {
    "label": "RFC 1001: NetBIOS over TCP/UDP",
    "url": "https://www.rfc-editor.org/rfc/rfc1001.html",
    "section": "Section 15: NetBIOS name service",
    "kind": "primary"
  },
  "mdns": {
    "label": "RFC 6762: Multicast DNS",
    "url": "https://www.rfc-editor.org/rfc/rfc6762.html",
    "section": "Abstract and section 1",
    "kind": "primary"
  },
  "wpad": {
    "label": "Microsoft: WinHTTP AutoProxy support",
    "url": "https://learn.microsoft.com/en-us/windows/win32/winhttp/winhttp-autoproxy-support",
    "section": "WPAD and proxy auto-configuration",
    "kind": "primary"
  },
  "sid": {
    "label": "Microsoft: Security identifiers",
    "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers",
    "section": "Security identifiers; components of a SID",
    "kind": "primary"
  },
  "acl": {
    "label": "Microsoft: Access control lists",
    "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists",
    "section": "DACLs and SACLs",
    "kind": "primary"
  },
  "ace": {
    "label": "Microsoft: Access control entries",
    "url": "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-entries",
    "section": "Access control entries",
    "kind": "primary"
  },
  "gpo": {
    "label": "Microsoft: Group Policy overview",
    "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-policy/group-policy-overview",
    "section": "Group Policy objects",
    "kind": "primary"
  },
  "gmsa": {
    "label": "Microsoft: Group managed service accounts",
    "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-managed-service-accounts/group-managed-service-accounts/group-managed-service-accounts-overview",
    "section": "Feature description",
    "kind": "primary"
  },
  "dmsa": {
    "label": "Microsoft: Delegated managed service accounts",
    "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/delegated-managed-service-accounts/delegated-managed-service-accounts-overview",
    "section": "Overview",
    "kind": "primary"
  },
  "laps": {
    "label": "Microsoft: Windows LAPS overview",
    "url": "https://learn.microsoft.com/en-us/windows-server/identity/laps/laps-overview",
    "section": "Windows LAPS; supported backup directories",
    "kind": "primary"
  },
  "dpapi": {
    "label": "Microsoft: CryptProtectData and data protection",
    "url": "https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata",
    "section": "Remarks and protection scope",
    "kind": "primary"
  },
  "credentials": {
    "label": "Microsoft: Credentials processes",
    "url": "https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication",
    "section": "Local Security Authority; Security Accounts Manager database",
    "kind": "primary"
  },
  "naming": {
    "label": "Microsoft: User naming attributes",
    "url": "https://learn.microsoft.com/en-us/windows/win32/ad/naming-properties",
    "section": "userPrincipalName",
    "kind": "primary"
  },
  "ou": {
    "label": "Microsoft: Designing organizational units",
    "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/creating-an-organizational-unit-design",
    "section": "OU owner role; Account OUs and resource OUs",
    "kind": "primary"
  },
  "adds": {
    "label": "Microsoft: Active Directory Domain Services overview",
    "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview",
    "section": "Directory services and domain controllers",
    "kind": "primary"
  },
  "adcs": {
    "label": "Microsoft: Active Directory Certificate Services",
    "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/active-directory-certificate-services-overview",
    "section": "AD CS overview",
    "kind": "primary"
  },
  "ntauth": {
    "label": "Microsoft: Enterprise NTAuth store",
    "url": "https://learn.microsoft.com/en-us/troubleshoot/windows-server/certificates-and-public-key-infrastructure-pki/import-third-party-ca-to-enterprise-ntauth-store",
    "section": "More information",
    "kind": "primary"
  },
  "uac": {
    "label": "Microsoft: How User Account Control works",
    "url": "https://learn.microsoft.com/en-us/windows-server/security/user-account-control/how-user-account-control-works",
    "section": "Administrator access tokens; consent and credential prompts",
    "kind": "primary"
  },
  "system": {
    "label": "Microsoft: LocalSystem account",
    "url": "https://learn.microsoft.com/en-us/windows/win32/services/localsystem-account",
    "section": "LocalSystem account",
    "kind": "primary"
  },
  "hvci": {
    "label": "Microsoft: Memory integrity",
    "url": "https://learn.microsoft.com/en-us/windows/security/hardware-security/enable-virtualization-based-protection-of-code-integrity",
    "section": "Memory integrity overview",
    "kind": "primary"
  },
  "drivers": {
    "label": "Microsoft: Recommended driver block rules",
    "url": "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/design/microsoft-recommended-driver-block-rules",
    "section": "Vulnerable driver blocklist",
    "kind": "primary"
  },
  "wdac": {
    "label": "Microsoft: App Control for Business",
    "url": "https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/appcontrol",
    "section": "App Control for Business",
    "kind": "primary"
  },
  "amsi": {
    "label": "Microsoft: Antimalware Scan Interface",
    "url": "https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal",
    "section": "AMSI overview",
    "kind": "primary"
  },
  "lolbas": {
    "label": "LOLBAS project: About",
    "url": "https://lolbas-project.github.io/",
    "section": "Goals and criteria",
    "kind": "primary"
  },
  "impersonate": {
    "label": "Microsoft: Impersonate a client after authentication",
    "url": "https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/impersonate-a-client-after-authentication",
    "section": "Reference",
    "kind": "primary"
  },
  "smb": {
    "label": "Microsoft: SMB overview",
    "url": "https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview",
    "section": "Feature description",
    "kind": "primary"
  },
  "ldap": {
    "label": "RFC 4511: LDAP",
    "url": "https://www.rfc-editor.org/rfc/rfc4511.html",
    "section": "Abstract; section 1",
    "kind": "primary"
  },
  "ldaps": {
    "label": "Microsoft: LDAP over SSL",
    "url": "https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/enable-ldap-over-ssl-3rd-certification-authority",
    "section": "LDAP over SSL/TLS overview",
    "kind": "primary"
  },
  "winrm": {
    "label": "Microsoft: Windows Remote Management",
    "url": "https://learn.microsoft.com/en-us/windows/win32/winrm/portal",
    "section": "Purpose",
    "kind": "primary"
  },
  "rdp": {
    "label": "Microsoft: Remote Desktop Protocol",
    "url": "https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/understanding-remote-desktop-protocol",
    "section": "Understanding RDP",
    "kind": "primary"
  },
  "wmi": {
    "label": "Microsoft: WMI",
    "url": "https://learn.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page",
    "section": "Purpose",
    "kind": "primary"
  },
  "dcom": {
    "label": "Microsoft: COM and DCOM",
    "url": "https://learn.microsoft.com/en-us/windows/win32/com/com-clients-and-servers",
    "section": "Network extensions and distributed COM",
    "kind": "primary"
  },
  "rpc": {
    "label": "Microsoft: Remote Procedure Call",
    "url": "https://learn.microsoft.com/en-us/windows/win32/rpc/rpc-start-page",
    "section": "Purpose",
    "kind": "primary"
  },
  "epa": {
    "label": "Microsoft: Extended Protection for Authentication",
    "url": "https://learn.microsoft.com/en-us/windows/win32/secauthn/epa-support-in-service",
    "section": "What is EPA?; Service Binding",
    "kind": "primary"
  },
  "binding": {
    "label": "RFC 5056: Channel bindings",
    "url": "https://www.rfc-editor.org/rfc/rfc5056.html",
    "section": "Abstract and section 2: Definitions",
    "kind": "primary"
  },
  "signing": {
    "label": "Microsoft: SMB signing overview",
    "url": "https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing-overview",
    "section": "How signing works",
    "kind": "primary"
  },
  "arp": {
    "label": "RFC 826: Address Resolution Protocol",
    "url": "https://www.rfc-editor.org/rfc/rfc826.html",
    "section": "Abstract and protocol description",
    "kind": "primary"
  },
  "edr": {
    "label": "Microsoft: Endpoint detection and response",
    "url": "https://learn.microsoft.com/en-us/defender-endpoint/overview-endpoint-detection-response",
    "section": "Overview",
    "kind": "primary"
  },
  "bloodhound": {
    "label": "SpecterOps: BloodHound introduction",
    "url": "https://bloodhound.specterops.io/get-started/introduction",
    "section": "Introduction",
    "kind": "primary"
  },
  "tiers": {
    "label": "Microsoft: Enterprise access model",
    "url": "https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model",
    "section": "Evolution from the legacy AD tier model; Tier 0 scope expansion",
    "kind": "primary"
  },
  "roast": {
    "label": "MITRE ATT&CK: Kerberoasting",
    "url": "https://attack.mitre.org/techniques/T1558/003/",
    "section": "Description (concept definition only)",
    "kind": "taxonomy"
  },
  "asroast": {
    "label": "MITRE ATT&CK: AS-REP Roasting",
    "url": "https://attack.mitre.org/techniques/T1558/004/",
    "section": "Description (concept definition only)",
    "kind": "taxonomy"
  },
  "golden": {
    "label": "MITRE ATT&CK: Golden Ticket",
    "url": "https://attack.mitre.org/techniques/T1558/001/",
    "section": "Description (concept definition only)",
    "kind": "taxonomy"
  },
  "silver": {
    "label": "MITRE ATT&CK: Silver Ticket",
    "url": "https://attack.mitre.org/techniques/T1558/002/",
    "section": "Description (concept definition only)",
    "kind": "taxonomy"
  },
  "pth": {
    "label": "MITRE ATT&CK: Pass the Hash",
    "url": "https://attack.mitre.org/techniques/T1550/002/",
    "section": "Description (concept definition only)",
    "kind": "taxonomy"
  },
  "ptt": {
    "label": "MITRE ATT&CK: Pass the Ticket",
    "url": "https://attack.mitre.org/techniques/T1550/003/",
    "section": "Description (concept definition only)",
    "kind": "taxonomy"
  },
  "dcsync": {
    "label": "MITRE ATT&CK: DCSync",
    "url": "https://attack.mitre.org/techniques/T1003/006/",
    "section": "Description (concept definition only)",
    "kind": "taxonomy"
  },
  "relay": {
    "label": "MITRE ATT&CK: Name Resolution Poisoning and SMB Relay",
    "url": "https://attack.mitre.org/techniques/T1557/001/",
    "section": "Description (concept definition only)",
    "kind": "taxonomy"
  },
  "mitm": {
    "label": "MITRE ATT&CK: Adversary-in-the-Middle",
    "url": "https://attack.mitre.org/techniques/T1557/",
    "section": "Description (concept definition only)",
    "kind": "taxonomy"
  },
  "c2": {
    "label": "MITRE ATT&CK: Command and Control",
    "url": "https://attack.mitre.org/tactics/TA0011/",
    "section": "Description",
    "kind": "taxonomy"
  },
  "wdacName": {
    "label": "Microsoft: Windows 11 24H2, App Control for Business",
    "url": "https://learn.microsoft.com/en-us/windows/whats-new/whats-new-windows-11-version-24h2",
    "section": "App Control for Business",
    "kind": "primary"
  },
  "netntlmNames": {
    "label": "Hashcat: documented format names",
    "url": "https://hashcat.net/wiki/doku.php?id=hashcat",
    "section": "Options: format names NetNTLMv1 and NetNTLMv2 (names only)",
    "kind": "primary"
  },
  "forcedAuth": {
    "label": "MITRE ATT&CK: Forced Authentication",
    "url": "https://attack.mitre.org/techniques/T1187/",
    "section": "Opening conceptual definition only",
    "kind": "taxonomy"
  },
  "potatoNames": {
    "label": "MITRE ATT&CK: Access Token Manipulation",
    "url": "https://attack.mitre.org/techniques/T1134/",
    "section": "Procedure Examples: JuicyPotato and BADPOTATO names only",
    "kind": "taxonomy"
  },
  "linuxCredentials": {
    "label": "Linux man-pages: process credentials",
    "url": "https://man7.org/linux/man-pages/man7/credentials.7.html",
    "section": "User and group identifiers",
    "kind": "primary"
  },
  "linuxExec": {
    "label": "Linux man-pages: execve",
    "url": "https://man7.org/linux/man-pages/man2/execve.2.html",
    "section": "DESCRIPTION: set-user-ID and set-group-ID bits",
    "kind": "primary"
  },
  "sudo": {
    "label": "Sudo manual",
    "url": "https://www.sudo.ws/docs/man/sudo.man/",
    "section": "DESCRIPTION",
    "kind": "primary"
  },
  "cron": {
    "label": "Cronie manual: cron",
    "url": "https://man7.org/linux/man-pages/man8/cron.8.html",
    "section": "NAME; DESCRIPTION",
    "kind": "primary"
  },
  "systemd": {
    "label": "systemd manual",
    "url": "https://www.freedesktop.org/software/systemd/man/latest/systemd.html",
    "section": "DESCRIPTION",
    "kind": "primary"
  },
  "linuxCapabilities": {
    "label": "Linux man-pages: capabilities",
    "url": "https://man7.org/linux/man-pages/man7/capabilities.7.html",
    "section": "DESCRIPTION",
    "kind": "primary"
  },
  "namespaces": {
    "label": "Linux man-pages: namespaces",
    "url": "https://man7.org/linux/man-pages/man7/namespaces.7.html",
    "section": "DESCRIPTION",
    "kind": "primary"
  },
  "cgroups": {
    "label": "Linux man-pages: cgroups",
    "url": "https://man7.org/linux/man-pages/man7/cgroups.7.html",
    "section": "DESCRIPTION",
    "kind": "primary"
  },
  "environment": {
    "label": "Linux man-pages: environment",
    "url": "https://man7.org/linux/man-pages/man7/environ.7.html",
    "section": "DESCRIPTION: PATH",
    "kind": "primary"
  },
  "nfs": {
    "label": "Linux NFS manual",
    "url": "https://man7.org/linux/man-pages/man5/nfs.5.html",
    "section": "DESCRIPTION",
    "kind": "primary"
  },
  "selinux": {
    "label": "SELinux manual",
    "url": "https://man7.org/linux/man-pages/man8/selinux.8.html",
    "section": "DESCRIPTION",
    "kind": "primary"
  },
  "apparmor": {
    "label": "Ubuntu: AppArmor",
    "url": "https://documentation.ubuntu.com/security/security-features/privilege-restriction/apparmor/",
    "section": "Introduction; Discretionary Access Control vs. Mandatory Access Control",
    "kind": "primary"
  }
};
