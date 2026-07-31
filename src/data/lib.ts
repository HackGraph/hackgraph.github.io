import type { TechniqueNodeDef } from './schema';

/**
 * Shared authoring helpers for the content layer. Chain files import these instead
 * of re-declaring them, so the boilerplate lives in exactly one place.
 */

/** MITRE ATT&CK reference builder: `mitre('T1558.003')` → `{ id, url }` with the
 *  canonical technique URL (sub-technique ids get the `/003/` path segment). */
export const mitre = (id: string): { id: string; url: string } => ({
  id,
  url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
});

/** A category (grouping) node. Its summary/description give the high-level
 *  "what lives in this folder" overview shown when the category is selected.
 *
 *  `sources` carries reading for the FAMILY, not for any one technique in it: the ATT&CK
 *  entry the children sit under, and an overview page worth reading before picking a
 *  branch. A category with nothing to read is a dead end for anyone who does not already
 *  know which child they want. */
export const cat = (
  id: string,
  label: string,
  phase: TechniqueNodeDef['phase'],
  summary: string,
  description: string,
  sources?: { mitre?: string; references?: { label: string; url: string }[] },
): TechniqueNodeDef => ({
  id, label, phase, kind: 'category', summary, description,
  ...(sources?.mitre ? { mitre: mitre(sources.mitre) } : {}),
  ...(sources?.references ? { references: sources.references } : {}),
});

/** Raw-string tag: `r\`net use \\\\host\`` keeps backslashes literally, so command
 *  snippets read as typed without doubling every escape. */
export const r = String.raw;
