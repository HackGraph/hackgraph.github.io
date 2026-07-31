/**
 * Loader for the vendored view layer.
 *
 * `view.js` is a classic script: it resolves the engine from `globalThis.GraphEngine` at
 * evaluation time and publishes itself the same way. Static ESM imports are hoisted, so the
 * engine has to be planted BEFORE the view module is evaluated — hence a dynamic import
 * behind a memoised promise rather than a plain top-level import.
 *
 * Kept separate from the React component so the awkwardness lives in one place and the
 * component reads as an ordinary effect.
 */
import { GraphEngine } from './index';
import './engine.css';

/** Everything the host can do to a mounted view. Mirrors `api` in view.js. */
export interface GraphViewApi {
  root: HTMLElement;
  readonly map: unknown;
  readonly route: string[];
  readonly selection: string | null;
  readonly expanded: string[];
  select(key: string): GraphViewApi;
  expand(key: string): GraphViewApi;
  collapse(key: string): GraphViewApi;
  clearSelection(): GraphViewApi;
  setMap(id: string, state?: unknown): GraphViewApi;
  setTheme(theme: 'dark' | 'light'): GraphViewApi;
  setFocus(on: boolean): GraphViewApi;
  setIsolate(on: boolean): GraphViewApi;
  setDimmed(ids: Iterable<string> | null): GraphViewApi;
  fit(): GraphViewApi;
  reset(): GraphViewApi;
  shareToken(): Promise<string>;
  destroy(): void;
}

/** What `onSelect` hands back when the lit selection changes. */
export interface SelectPayload {
  key: string;
  defId: string;
  node: { id: string; label: string; group: string } | undefined;
  route: string[];
}

export interface EdgeSelectPayload {
  id: string;
  rel?: string;
  source: string;
  target: string;
}

export interface MountOptions {
  maps: unknown[];
  startMap?: string;
  /** Cold start shows only the entry point rather than opening it. */
  expandRoot?: boolean;
  title?: string;
  /** Replaces the toolbar's default brand dot. An element, so nothing is parsed. */
  brandMark?: Element;
  repoUrl?: string;
  build?: { date?: string; hash?: string };
  theme?: 'dark' | 'light';
  chrome?: Partial<Record<'toolbar' | 'filters' | 'panel' | 'crumbs' | 'hint' | 'zoom', boolean>>;
  features?: Partial<
    Record<'search' | 'focus' | 'isolate' | 'share' | 'notes' | 'marks' | 'edgeTags', boolean>
  >;
  /** Host filter defs, same contract as the engine's built-ins. */
  filters?: unknown[];
  /** Decorate body prose in the panel (glossary, links, …). */
  prose?(el: HTMLElement, text: string): void;
  storagePrefix?: string;
  deepLink?: boolean;
  animationMs?: number;
  onSelect?(info: SelectPayload): void;
  onEdgeSelect?(info: EdgeSelectPayload): void;
  onRouteChange?(info: { route: string[]; trail: string[] }): void;
  onReady?(api: GraphViewApi): void;
}

interface GraphViewModule {
  mount(target: string | HTMLElement, options: MountOptions): GraphViewApi;
  version: string;
}

let pending: Promise<GraphViewModule> | null = null;

/** Resolve the view module, loading it at most once per page. */
export function loadGraphView(): Promise<GraphViewModule> {
  if (!pending) {
    // the view reads this on evaluation; it must exist first
    (globalThis as unknown as { GraphEngine: unknown }).GraphEngine = GraphEngine;
    pending = import('./view.js').then(() => {
      const view = (globalThis as unknown as { GraphView?: GraphViewModule }).GraphView;
      if (!view) throw new Error('graph view failed to publish itself on globalThis');
      return view;
    });
  }
  return pending;
}
