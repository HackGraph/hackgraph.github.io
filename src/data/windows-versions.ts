/**
 * Canonical Windows version axis for the version filter.
 *
 * A technique node may carry `versions?: string[]` listing the version ids it applies
 * to (feature-update granularity). Omitting the field means "all versions" — only the
 * version-SPECIFIC vectors (UAC bypasses patched in a given build, build-locked CVEs,
 * etc.) enumerate a restricted set. The filter dims any node whose `versions` is
 * defined and does NOT include the selected target version.
 *
 * Order matters: entries are listed oldest → newest within each family (client first,
 * then server) so `range(from, to)` can slice a contiguous span by id.
 */
export interface WindowsVersion {
  id: string;
  label: string;
  family: 'client' | 'server';
}

export const WINDOWS_VERSIONS: WindowsVersion[] = [
  { id: 'win7', label: 'Windows 7', family: 'client' },
  { id: 'win8', label: 'Windows 8 / 8.1', family: 'client' },
  { id: 'win10-1507', label: 'Windows 10 1507', family: 'client' },
  { id: 'win10-1607', label: 'Windows 10 1607', family: 'client' },
  { id: 'win10-1703', label: 'Windows 10 1703', family: 'client' },
  { id: 'win10-1709', label: 'Windows 10 1709', family: 'client' },
  { id: 'win10-1803', label: 'Windows 10 1803', family: 'client' },
  { id: 'win10-1809', label: 'Windows 10 1809', family: 'client' },
  { id: 'win10-1903', label: 'Windows 10 1903', family: 'client' },
  { id: 'win10-1909', label: 'Windows 10 1909', family: 'client' },
  { id: 'win10-2004', label: 'Windows 10 2004', family: 'client' },
  { id: 'win10-20h2', label: 'Windows 10 20H2', family: 'client' },
  { id: 'win10-21h1', label: 'Windows 10 21H1', family: 'client' },
  { id: 'win10-21h2', label: 'Windows 10 21H2', family: 'client' },
  { id: 'win10-22h2', label: 'Windows 10 22H2', family: 'client' },
  { id: 'win11-21h2', label: 'Windows 11 21H2', family: 'client' },
  { id: 'win11-22h2', label: 'Windows 11 22H2', family: 'client' },
  { id: 'win11-23h2', label: 'Windows 11 23H2', family: 'client' },
  { id: 'win11-24h2', label: 'Windows 11 24H2', family: 'client' },
  { id: 'srv2008', label: 'Server 2008 / R2', family: 'server' },
  { id: 'srv2012', label: 'Server 2012 / R2', family: 'server' },
  { id: 'srv2016', label: 'Server 2016', family: 'server' },
  { id: 'srv2019', label: 'Server 2019', family: 'server' },
  { id: 'srv2022', label: 'Server 2022', family: 'server' },
  { id: 'srv2025', label: 'Server 2025', family: 'server' },
];

const ORDER = WINDOWS_VERSIONS.map((v) => v.id);

export const ALL_VERSION_IDS = [...ORDER];
export const CLIENT_IDS = WINDOWS_VERSIONS.filter((v) => v.family === 'client').map((v) => v.id);
export const SERVER_IDS = WINDOWS_VERSIONS.filter((v) => v.family === 'server').map((v) => v.id);

/** Inclusive contiguous span of version ids, by position in WINDOWS_VERSIONS.
 *  `range('win10-1607', 'win10-22h2')` → every Win10 build in between (no servers,
 *  since they sit after all client entries). Combine with explicit server ids. */
export function range(fromId: string, toId?: string): string[] {
  const i = ORDER.indexOf(fromId);
  if (i < 0) return [];
  const j = toId ? ORDER.indexOf(toId) : ORDER.length - 1;
  return j < i ? [] : ORDER.slice(i, j + 1);
}

const LABELS = new Map(WINDOWS_VERSIONS.map((v) => [v.id, v.label]));
export const versionLabel = (id: string): string => LABELS.get(id) ?? id;
