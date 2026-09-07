import { relationshipDefinition } from './relationship-review.js';

/** Resolve presentation only. A shared definition never becomes an edge claim. */
export function connectionPresentation(edge) {
  const definition = edge.rel ? relationshipDefinition(edge.rel) : undefined;
  return {
    label: edge.label ?? definition?.label ?? 'connection',
    description: edge.description ?? '',
    definition,
    hasAuthoredCaption: edge.label !== undefined,
  };
}
