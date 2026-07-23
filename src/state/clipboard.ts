/**
 * Copy text to the clipboard, working in BOTH secure and insecure contexts.
 *
 * `navigator.clipboard` only exists in a secure context (https or localhost), so on a
 * dev server reached over plain HTTP / an IP (e.g. `http://10.0.0.5:5173`) it is
 * undefined and a naive `writeText` throws — the copy silently fails. We try the modern
 * API first, then fall back to a hidden-textarea `execCommand('copy')`, which works in
 * insecure contexts (it must run inside the click's user-gesture, which it does here).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
