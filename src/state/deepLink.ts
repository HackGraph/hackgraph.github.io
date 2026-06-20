import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import type { NodeId } from '../graph/buildModel';

/** Shareable view state encoded in the URL hash: which map, what's expanded, what's selected. */
export interface DeepLink {
  mapId: string | null;
  open: NodeId[];
  sel: NodeId | null;
}

const EMPTY: DeepLink = { mapId: null, open: [], sel: null };

// The expanded set is a list of `~`-delimited render keys that share long common
// prefixes, so a deep exploration balloons the URL. We serialise the state to the
// familiar `map=…&open=…&sel=…` query string, DEFLATE it (fflate, synchronous, pure
// client-side JS — no server), and base64url it into one opaque token `#s=…`
// (~60% shorter than the raw query). Old readable links (`#map=…&open=…&sel=…`, no
// `s=`) are still parsed, so existing shares keep working.

/** Uint8Array → base64url (no padding). */
function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url → Uint8Array. */
function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** state → `map=…&open=…&sel=…` query string (the inner, pre-compression form). */
function serialize(link: DeepLink): string {
  const params = new URLSearchParams();
  if (link.mapId) params.set('map', link.mapId);
  if (link.open.length) params.set('open', link.open.join(','));
  if (link.sel) params.set('sel', link.sel);
  return params.toString();
}

/** `map=…&open=…&sel=…` query string → state. */
function deserialize(query: string): DeepLink {
  const params = new URLSearchParams(query);
  return {
    mapId: params.get('map'),
    open: (params.get('open') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    sel: params.get('sel') || null,
  };
}

/** The hash body for a state: `s=<deflated base64url token>`, or '' for empty. */
export function encodeHash(link: DeepLink): string {
  const query = serialize(link);
  if (!query) return '';
  return `s=${bytesToBase64Url(deflateSync(strToU8(query), { level: 9 }))}`;
}

function decodeHash(hashBody: string): DeepLink {
  if (!hashBody) return EMPTY;
  const params = new URLSearchParams(hashBody);
  const token = params.get('s');
  if (token != null) {
    try {
      return deserialize(strFromU8(inflateSync(base64UrlToBytes(token))));
    } catch {
      return EMPTY; // malformed/garbage token — fail soft to empty
    }
  }
  // Legacy readable format (no `s=` token) — parse the hash as the query directly.
  return deserialize(hashBody);
}

export function readDeepLink(): DeepLink {
  if (typeof window === 'undefined') return EMPTY;
  return decodeHash(window.location.hash.replace(/^#/, ''));
}

export function writeDeepLink(link: DeepLink): void {
  if (typeof window === 'undefined') return;
  const body = encodeHash(link);
  const url = body ? `#${body}` : window.location.pathname + window.location.search;
  window.history.replaceState(null, '', url);
}

/** Absolute, shareable URL for a state (used by the "copy link to node" action). */
export function shareUrl(link: DeepLink): string {
  const base =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}${window.location.pathname}${window.location.search}`;
  const body = encodeHash(link);
  return body ? `${base}#${body}` : base;
}

// Exposed for unit tests (pure, no `window`).
export const __deepLinkInternals = { serialize, deserialize, encodeHash, decodeHash };
