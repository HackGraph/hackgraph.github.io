// Explicit snapshot from tools/stamp-availability.mjs; no content verification.
export const SOURCE_AVAILABILITY = {
  "scope": "HTTP access observations only; no claim verification.",
  "checkedAt": "2026-09-07T14:11:11.371Z",
  "checkedUrls": 874,
  "counts": {
    "responded": 869,
    "blocked": 4,
    "unreachable": 1
  },
  "exceptions": {
    "https://research.ifcr.dk/certifried-active-directory-domain-privilege-escalation-cve-2022-26923-9e098fe298f4": {
      "code": 403,
      "status": "blocked",
      "checkedAt": "2026-09-07T11:16:50.894Z",
      "attempts": [
        {
          "method": "GET",
          "code": 403,
          "finalUrl": "https://research.ifcr.dk/certifried-active-directory-domain-privilege-escalation-cve-2022-26923-9e098fe298f4"
        }
      ]
    },
    "https://research.ifcr.dk/certipy-2-0-bloodhound-new-escalations-shadow-credentials-golden-certificates-and-more-34d1c26f0dc6": {
      "code": 403,
      "status": "blocked",
      "checkedAt": "2026-09-07T11:16:50.954Z",
      "attempts": [
        {
          "method": "GET",
          "code": 403,
          "finalUrl": "https://research.ifcr.dk/certipy-2-0-bloodhound-new-escalations-shadow-credentials-golden-certificates-and-more-34d1c26f0dc6"
        }
      ]
    },
    "https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-authentication-and-request-methods-and-more-7237d88061f7": {
      "code": 403,
      "status": "blocked",
      "checkedAt": "2026-09-07T11:16:51.274Z",
      "attempts": [
        {
          "method": "GET",
          "code": 403,
          "finalUrl": "https://research.ifcr.dk/certipy-4-0-esc9-esc10-bloodhound-gui-new-authentication-and-request-methods-and-more-7237d88061f7"
        }
      ]
    },
    "https://www.akamai.com/blog/security-research/abusing-dmsa-for-privilege-escalation-in-active-directory": {
      "code": 403,
      "status": "blocked",
      "checkedAt": "2026-09-07T11:17:01.936Z",
      "attempts": [
        {
          "method": "GET",
          "code": 403,
          "finalUrl": "https://www.akamai.com/blog/security-research/abusing-dmsa-for-privilege-escalation-in-active-directory"
        }
      ]
    },
    "https://www.sophos.com/en-us/research/skeleton-key-malware-analysis": {
      "code": 0,
      "status": "unreachable",
      "checkedAt": "2026-09-07T07:00:46.603Z",
      "attempts": [
        {
          "method": "HEAD",
          "code": 0,
          "error": {
            "name": "TimeoutError",
            "code": 23,
            "message": "The operation was aborted due to timeout"
          }
        },
        {
          "method": "GET",
          "code": 0,
          "error": {
            "name": "TimeoutError",
            "code": 23,
            "message": "The operation was aborted due to timeout"
          }
        }
      ]
    }
  }
};
