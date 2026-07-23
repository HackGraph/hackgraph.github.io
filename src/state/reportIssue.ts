import { BUILD_HASH } from '../buildInfo';
import { REPO_URL } from './repo';

/**
 * "Report an issue" deep-links: build a GitHub new-issue URL with the title/body
 * pre-filled from the node or edge the reader is looking at (plus the build hash, so
 * the report is reproducible), so a correction lands with the exact context attached.
 */
function build(title: string, body: string): string {
  const params = new URLSearchParams({ title, body, labels: 'content' });
  return `${REPO_URL}/issues/new?${params.toString()}`;
}

export function reportNodeIssueUrl(node: { id: string; label: string }, mapName: string): string {
  const body = [
    `**Node:** ${node.label} (\`${node.id}\`)`,
    `**Map:** ${mapName}`,
    `**Build:** \`${BUILD_HASH}\``,
    '',
    '**What looks wrong?**',
    "<!-- e.g. a wrong command/flag, an outdated or patched vector, an incorrect MITRE id, a dead/incorrect reference, or a step that doesn't hold. Please cite a source if you can. -->",
    '',
  ].join('\n');
  return build(`Content issue: ${node.label}`, body);
}

export function reportEdgeIssueUrl(
  edge: { source: string; target: string; sourceLabel: string; targetLabel: string },
  mapName: string,
): string {
  const body = [
    `**Edge:** ${edge.sourceLabel} (\`${edge.source}\`) → ${edge.targetLabel} (\`${edge.target}\`)`,
    `**Map:** ${mapName}`,
    `**Build:** \`${BUILD_HASH}\``,
    '',
    '**What looks wrong?**',
    "<!-- Does this transition not hold? Is the caption wrong, or a step missing / misdirected? Please cite a source if you can. -->",
    '',
  ].join('\n');
  return build(`Content issue: edge ${edge.sourceLabel} → ${edge.targetLabel}`, body);
}
