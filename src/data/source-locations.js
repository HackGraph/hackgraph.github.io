// AI inspection of publication identity/location, 2026-09-07 UTC.
// These observations came from the web reader, which may use indexed content.
// They do not override live HTTP checks or review the claims citing these pages.
// Evidence: reports/DEFENSIVE_REVIEW.md and reports/article-provenance-reader.json.
export const SOURCE_LOCATIONS = {
  'https://research.ifcr.dk/certifried-active-directory-domain-privilege-escalation-cve-2022-26923-9e098fe298f4': {
    checkedAt: '2026-09-07', reviewerType: 'ai', reviewedBy: 'Codex', method: 'web-reader',
    title: 'Certifried: Active Directory Domain Privilege Escalation (CVE-2022–26923)',
    author: 'Oliver Lyak', publishedAt: '2022-05-10',
  },
  'https://research.ifcr.dk/certipy-2-0-bloodhound-new-escalations-shadow-credentials-golden-certificates-and-more-34d1c26f0dc6': {
    checkedAt: '2026-09-07', reviewerType: 'ai', reviewedBy: 'Codex', method: 'web-reader',
    title: 'Certipy 2.0: BloodHound, New Escalations, Shadow Credentials, Golden Certificates, and more!',
    author: 'Oliver Lyak', publishedAt: '2022-02-19',
  },
  'https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-authentication-and-request-methods-and-more-7237d88061f7': {
    checkedAt: '2026-09-07', reviewerType: 'ai', reviewedBy: 'Codex', method: 'web-reader',
    title: 'Certipy 4.0: ESC9 & ESC10, BloodHound GUI, New Authentication and Request Methods — and more!',
    author: 'Oliver Lyak', publishedAt: '2022-08-04',
  },
  'https://www.akamai.com/blog/security-research/abusing-dmsa-for-privilege-escalation-in-active-directory': {
    checkedAt: '2026-09-07', reviewerType: 'ai', reviewedBy: 'Codex', method: 'web-reader',
    title: 'BadSuccessor: Abusing dMSA to Escalate Privileges in Active Directory',
  },
  'https://www.sophos.com/en-us/research/skeleton-key-malware-analysis': {
    checkedAt: '2026-09-07', reviewerType: 'ai', reviewedBy: 'Codex', method: 'web-reader',
    title: 'Skeleton Key Malware Analysis', author: 'Dell SecureWorks Counter Threat Unit Threat Intelligence', publishedAt: '2015-01-12',
    previousUrl: 'https://www.secureworks.com/research/skeleton-key-malware-analysis',
  },
};
