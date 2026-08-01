"use strict";
/* Fan-Out Graph — the DATA. Every dataset lives here and only here: edit or
   replace this file to change the product; the engine never has to know.
   Each map follows the generic contract documented below and registers itself
   in MAPS at the bottom. */

/* ---------- generic map contract ----------
   node: { id, label, group, summary?, kind }   kind: technique|category|start|goal
   map:  { id, name, rootId, phases[{id,label,color}], nodes[], edges[{source,target,rel?}],
           relationships{ rel: {label, summary} } }
   The engine below is domain-blind; only generateMap() knows the demo content. */

const PHASES = [
  { id: 'start',   label: 'Start',     color: 'oklch(0.70 0.13 245)' },
  { id: 'plan',    label: 'Plan',      color: 'oklch(0.70 0.13 245)' },
  { id: 'build',   label: 'Build',     color: 'oklch(0.70 0.13 160)' },
  { id: 'test',    label: 'Test & QA', color: 'oklch(0.70 0.13 95)' },
  { id: 'release', label: 'Release',   color: 'oklch(0.70 0.13 55)' },
  { id: 'operate', label: 'Operate',   color: 'oklch(0.70 0.13 305)' },
  { id: 'gate',    label: 'Gate',      color: 'oklch(0.70 0.13 350)' },
];
const CYCLE = ['Plan', 'Build', 'Test & QA', 'Release', 'Operate'];

const STEPS = [
  ['Verify Artifact',      'Run the suite against the built artifact and gate the promotion on it.'],
  ['Prepare Target',       'Provision the target environment and verify its health before traffic.'],
  ['Publish Image',        'Publish the signed image to the registry and record the digest.'],
  ['Progressive Roll-out', 'Roll the change out progressively and watch the error budget.'],
  ['Observe & Trace',      'Collect traces and logs, then feed regressions back into the plan.'],
  ['Migration Check',      'Check the migration applies cleanly and is reversible under load.'],
  ['Config Validation',    'Validate the config bundle against the schema for every environment.'],
];

// dataset detail the engine passes through without interpreting — the detail
// panel renders whatever is here; a map with none simply shows less
const ENVS = ['development', 'staging', 'production'];
const ROLES = ['anyone', 'contributor', 'maintainer', 'admin'];
const STEP_DETAILS = {
  'Verify Artifact': {
    description: 'Pull the built artifact from the registry and run the full verification suite against exactly those bytes. Promotion is gated on a green run — a red suite stops the train here, not further down.',
    tools: ['ci-runner', 'test-harness'],
    commands: ['ci verify --artifact $SHA', 'ci report --last'],
    refs: [['Verification policy', 'https://example.com/policy/verify']],
  },
  'Prepare Target': {
    description: 'Provision the target environment from the infrastructure definition and hold it out of the traffic pool until its health checks pass twice in a row.',
    tools: ['terraform', 'health-probe'],
    commands: ['infra apply --env $ENV', 'probe wait --healthy 2'],
    refs: [['Environment catalogue', 'https://example.com/envs']],
  },
  'Publish Image': {
    description: 'Sign the image, push it to the registry, and record the digest in the release manifest so every later step refers to an immutable artifact.',
    tools: ['registry-cli', 'cosign'],
    commands: ['img push --sign', 'manifest record $DIGEST'],
    caution: 'Never overwrite a published tag — a digest already referenced by a manifest must stay immutable.',
  },
  'Progressive Roll-out': {
    description: 'Shift traffic in steps (1% → 10% → 50% → 100%), watching the error budget between each step. Any budget burn halts the roll-out where it stands.',
    tools: ['rollout-ctl', 'error-budget'],
    commands: ['rollout start --steps 1,10,50,100', 'rollout halt'],
    caution: 'Halting keeps the current split — it does not roll traffic back on its own.',
  },
  'Observe & Trace': {
    description: 'Watch traces, logs and golden signals for the newly shifted traffic; regressions found here feed back into the plan for the next round.',
    tools: ['tracer', 'log-query'],
    commands: ['trace tail --release $SHA', 'logq errors --since 15m'],
  },
  'Migration Check': {
    description: 'Apply the migration to a production-shaped copy, verify it is reversible under load, and record the rollback path before anything irreversible runs.',
    tools: ['migrate', 'load-sim'],
    commands: ['migrate dry-run', 'migrate apply --reversible'],
    caution: 'An irreversible migration needs a maintainer sign-off before this step may pass.',
  },
  'Config Validation': {
    description: 'Validate the whole config bundle against the schema for every environment at once, so an environment-specific typo cannot wait in ambush.',
    tools: ['conf-lint'],
    commands: ['conf validate --all-envs'],
  },
  Gate: {
    description: 'The convergence point of the stage: every branch must arrive green. A red branch loops the stage back to its first step for rework.',
    refs: [['Promotion rules', 'https://example.com/policy/promotion']],
  },
};

// finite demo map: fan-out per depth 6/7/5, three levels deep. Every sibling
// group converges on a shared gate; each parent fast-tracks straight to its
// gate (a skip-level edge); each gate loops BACK to the group's first step
// (a genuine cycle, which the engine unrolls into forward "#2" instances).
function generateMap() {
  const KIDS = [6, 7, 5], MAXD = 3;
  const nodes = [], edges = [];
  nodes.push({
    id: 'root', label: 'Fan-Out Start', group: 'Start', kind: 'start',
    summary: 'A deliberately wide graph: every step opens six or seven next steps.',
  });
  const walk = (pid, pdepth, pcat) => {
    const k = KIDS[pdepth % KIDS.length];
    const kids = [];
    for (let i = 1; i <= k; i++) {
      const id = pid === 'root' ? String(i) : pid + '.' + i;
      const [name, summary] = STEPS[(i - 1) % STEPS.length];
      const ci = (pcat + i - 1) % CYCLE.length;
      nodes.push({
        id, label: name + ' ' + id, group: CYCLE[ci], kind: 'step', summary,
        env: ENVS[(pdepth + i) % ENVS.length],
        role: ROLES[i % ROLES.length],
        details: { ...STEP_DETAILS[name], prereqs: i > 1 ? [kids[i - 2].id] : [pid === 'root' ? null : pid].filter(Boolean) },
      });
      edges.push({ source: pid, target: id, rel: 'then' });
      kids.push({ id, ci });
    }
    const gid = pid === 'root' ? 'g' : pid + '.g';
    nodes.push({
      id: gid, label: 'Promotion Gate ' + gid, group: 'Gate', kind: 'goal',
      summary: 'Every branch of this stage must pass here before the next stage proceeds.',
      role: 'maintainer',
      details: { ...STEP_DETAILS.Gate, prereqs: kids.map(kd => kd.id) },
    });
    edges.push({ source: pid, target: gid, rel: 'fast-track' });
    kids.forEach(kd => edges.push({ source: kd.id, target: gid, rel: 'gate' }));
    edges.push({ source: gid, target: kids[0].id, rel: 'rework' });
    if (pdepth + 1 < MAXD) kids.forEach(kd => walk(kd.id, pdepth + 1, kd.ci));
  };
  walk('root', 0, 0);
  return {
    id: 'pipeline', name: 'Release Pipeline', rootId: 'root',
    phases: PHASES, nodes, edges,
    relationships: {
      then:        { label: 'then',       summary: 'The natural next step in this stage.' },
      gate:        { label: 'must pass',  summary: 'This branch must pass the stage gate before promotion continues.' },
      'fast-track': { label: 'fast-track', summary: 'Skips the intermediate steps and goes straight to the stage gate.' },
      rework:      { label: 'rework',     summary: 'A failed gate loops back to the first step for another round.' },
    },
  };
}

// a second, hand-authored map: proves the engine is domain-blind, exercises
// fan-in (two detections converge), a skip edge, a feedback cycle, and per-map
// filter applicability (no node declares an environment here)
function incidentMap() {
  const D = (description, extra) => ({ description, ...extra });
  const nodes = [
    { id: 'root', label: 'New Incident', group: 'Start', kind: 'start',
      summary: 'Something is wrong in production. Two detection paths converge on one triage.' },
    { id: 'alert', label: 'Alert Fires', group: 'Detect', kind: 'step', role: 'anyone',
      summary: 'A monitor crosses its threshold and pages the system.',
      details: D('An automated monitor breached its threshold. The alert carries the runbook link and the offending signal.', { tools: ['monitor', 'pager'] }) },
    { id: 'report', label: 'User Report', group: 'Detect', kind: 'step', role: 'anyone',
      summary: 'A person notices before the monitors do.',
      details: D('Support or a user reports breakage. Route it into the same triage as automated alerts — one queue, one picture.') },
    { id: 'assess', label: 'Assess Impact', group: 'Triage', kind: 'step', role: 'contributor',
      summary: 'Who is affected, how badly, and is it getting worse?',
      details: D('Establish blast radius: affected surfaces, error rates, trend. This is the node both detection paths converge on.', { commands: ['status snapshot', 'trend --last 30m'] }) },
    { id: 'page', label: 'Page On-call', group: 'Triage', kind: 'step', role: 'contributor',
      summary: 'Wake the person who owns the failing surface.' },
    { id: 'sev', label: 'Declare Severity', group: 'Triage', kind: 'step', role: 'maintainer',
      summary: 'Commit to a severity level and open the incident channel.',
      details: D('Severity decides who is pulled in and how loud the comms are. A false alarm can be closed straight to the all-clear.', { caution: 'Under-declaring severity is the classic failure — when in doubt, go one higher.' }) },
    { id: 'rollback', label: 'Roll Back Release', group: 'Mitigate', kind: 'step', role: 'admin',
      summary: 'Return to the last known-good version.',
      details: D('The fastest mitigation when the trigger was a release. Restores the previous digest from the manifest.', { commands: ['release rollback --last-good'] }) },
    { id: 'flag', label: 'Disable Feature Flag', group: 'Mitigate', kind: 'step', role: 'maintainer',
      summary: 'Turn the offending code path off without a deploy.' },
    { id: 'scale', label: 'Scale Capacity', group: 'Mitigate', kind: 'step', role: 'maintainer',
      summary: 'Buy headroom while the real fix lands.' },
    { id: 'clear', label: 'All-clear Gate', group: 'Gate', kind: 'goal', role: 'maintainer',
      summary: 'Impact is back to baseline and stays there.',
      details: D('Metrics back at baseline for a full observation window. Only then does the incident move to review.') },
    { id: 'post', label: 'Postmortem', group: 'Review', kind: 'step', role: 'contributor',
      summary: 'Blameless write-up: timeline, causes, luck.' },
    { id: 'actions', label: 'Action Items', group: 'Review', kind: 'step', role: 'maintainer',
      summary: 'The fixes that stop the repeat — tracked to done.',
      details: D('Every postmortem action gets an owner and a date. Unowned actions feed the next incident — literally: see the feedback edge.') },
  ];
  const E = (source, target, rel) => ({ source, target, rel });
  const edges = [
    E('root', 'alert', 'triggers'), E('root', 'report', 'triggers'),
    E('alert', 'assess', 'escalates'), E('report', 'assess', 'escalates'),
    E('assess', 'page', 'triggers'), E('assess', 'sev', 'then'),
    E('sev', 'rollback', 'mitigates'), E('sev', 'flag', 'mitigates'), E('sev', 'scale', 'mitigates'),
    E('rollback', 'clear', 'gate'), E('flag', 'clear', 'gate'), E('scale', 'clear', 'gate'),
    E('sev', 'clear', 'gate'),
    E('clear', 'post', 'promotes'), E('post', 'actions', 'then'),
    E('actions', 'alert', 'feedback'),
  ];
  return {
    id: 'incident', name: 'Incident Response', rootId: 'root',
    phases: [
      { id: 'start', label: 'Start', color: 'oklch(0.70 0.13 245)' },
      { id: 'detect', label: 'Detect', color: 'oklch(0.70 0.13 232)' },
      { id: 'triage', label: 'Triage', color: 'oklch(0.70 0.13 95)' },
      { id: 'mitigate', label: 'Mitigate', color: 'oklch(0.70 0.13 55)' },
      { id: 'review', label: 'Review', color: 'oklch(0.70 0.13 160)' },
      { id: 'gate', label: 'Gate', color: 'oklch(0.70 0.13 350)' },
    ],
    nodes, edges,
    relationships: {
      triggers:  { label: 'triggers',  summary: 'Sets the next step in motion.' },
      escalates: { label: 'escalates', summary: 'Feeds the detection into triage.' },
      then:      { label: 'then',      summary: 'The natural next step.' },
      mitigates: { label: 'mitigates', summary: 'A way to reduce impact right now.' },
      gate:      { label: 'must pass', summary: 'The all-clear requires this branch to be resolved.' },
      promotes:  { label: 'promotes',  summary: 'Moves the incident into its review phase.' },
      feedback:  { label: 'feedback',  summary: 'Unfinished actions become the next incident.' },
    },
  };
}

// a deliberately tiny, letter-labelled map for debugging path logic: every
// node is ONE letter, so intended-vs-observed routes can be written down as
// plain strings ("expected A→F→B, saw A→B"). Mirrors the pipeline's shape:
// fan-out, a shared gate per group, a fast-track skip edge, a rework loop.
function debugMap() {
  const nodes = [], edges = [];
  const step = (id, summary) => nodes.push({ id, label: id, group: 'Steps', kind: 'step', summary });
  const goal = (id, summary) => nodes.push({ id, label: id, group: 'Gate', kind: 'goal', summary });
  const E = (source, target, rel) => edges.push({ source, target, rel });

  nodes.push({ id: 'A', label: 'A', group: 'Start', kind: 'start', summary: 'Root. Fans out to B–E, fast-tracks to gate F.' });
  ['B', 'C', 'D', 'E'].forEach(id => { step(id, 'Level-1 step ' + id + '.'); E('A', id, 'then'); });
  goal('F', 'Gate for B–E. Rework loops back to B.');
  E('A', 'F', 'fast-track');
  ['B', 'C', 'D', 'E'].forEach(id => E(id, 'F', 'gate'));
  E('F', 'B', 'rework');

  const fan = (parent, kids, gate) => {
    kids.forEach(id => { step(id, 'Child ' + id + ' of ' + parent + '.'); E(parent, id, 'then'); });
    goal(gate, 'Gate for ' + kids.join(', ') + '. Rework loops back to ' + kids[0] + '.');
    E(parent, gate, 'fast-track');
    kids.forEach(id => E(id, gate, 'gate'));
    E(gate, kids[0], 'rework');
  };
  fan('B', ['G', 'H', 'I'], 'J');
  fan('C', ['K', 'L', 'M'], 'N');
  fan('D', ['O', 'P', 'Q'], 'R');
  E('I', 'K', 'then');   // one cross-edge: K has parents in two different groups

  return {
    id: 'debug', name: 'Debug A–Z', rootId: 'A',
    phases: [
      { id: 'start', label: 'Start', color: 'oklch(0.70 0.13 245)' },
      { id: 'steps', label: 'Steps', color: '#8ab4f8' },
      { id: 'gate',  label: 'Gate',  color: 'oklch(0.70 0.13 350)' },
    ],
    nodes, edges,
    relationships: {
      then:        { label: 'then',       summary: 'Plain forward step.' },
      gate:        { label: 'must pass',  summary: 'This branch must pass the group gate.' },
      'fast-track': { label: 'fast-track', summary: 'Skips the steps straight to the gate.' },
      rework:      { label: 'rework',     summary: 'A failed gate loops back to the first step.' },
    },
  };
}

// the map registry: swapping the data swaps the product.
// Debug A–Z first = the DEFAULT map while path behaviour is being verified;
// move generateMap() back to the front when the letters have served their turn.
// Classic scripts share one scope, so the page that loads this file (index.html) reads
// MAPS directly. eslint cannot see across that boundary and calls it unused.
// eslint-disable-next-line no-unused-vars
const MAPS = [debugMap(), generateMap(), incidentMap()];

