# Layout decision — updated 7 September 2026 UTC

Keep the current renderer with incremental placement, stable peer ordering, and connector-lane selection. Keep ELK 0.12.0 as a development comparison dependency outside the public artifact.

The earlier solver let a newly revealed 100-child branch displace existing cards by an average of 4,447 px relative to the expanded parent. The revised solver eliminates that movement in this fixture. It also improves the broader sequence corpus substantially, with documented tradeoffs in density and collapse motion.

## What changed

- New cards reserve space without claiming an established position. Weighted packing gives existing cards priority and moves them when their spacing constraints require it. All-new columns retain balanced placement.
- Existing cards propagate necessary movement from known neighbors. A large set of new neighbors cannot pull a parent toward the center of their stack. Interrupted layouts use displayed coordinates.
- Existing peer order and authored single-parent sibling order become ordering constraints. Shared topics can stay between siblings. Conflicting history falls back to the ordinary authored ordering; this is not a guarantee for contradictory inputs.
- Connector lanes are chosen using a first-hop crossing score. Greedy insertion preserves ties and does not increase that score relative to the initial lane order. Card positions and connection endpoints are unchanged by lane selection.
- Collapse releases the removed branch's space while retaining compatible peer order. It does not keep the expansion's position constraints indefinitely.

## Fixed fixtures and ELK comparison

`npm run layout:compare` compares the earlier solver with and without 0.75 coordinate weighting, the revised solver, and ELK's original configuration. It runs six samples per case and discards the first for timing. Input preparation, layout, and route diagnostics are included. `npm run layout:geometry` adds dense convergence and a second ELK configuration using `forceNodeModelOrder`, `NODES_AND_EDGES`, and disabled semi-interactive minimization.

The table shows **non-incident crossings / mean existing-card movement**. Movement is relative to the expanded parent.

| Fixture | Previous solver | Revised solver | Original ELK | Ordered ELK |
| --- | ---: | ---: | ---: | ---: |
| Tree | 0 / 251.1 px | 0 / 0 px | 12 / 295.6 px | 0 / 382.8 px |
| Convergence | 0 / 224.5 px | 0 / 0 px | 12 / 280.1 px | 0 / 394.9 px |
| Cycle | 0 / 222.4 px | 0 / 0 px | 12 / 280.1 px | 0 / 394.9 px |
| Variable height | 0 / 306.1 px | 0 / 0 px | 12 / 348.6 px | 0 / 447.0 px |
| 100 children | 0 / 4447.4 px | 0 / 0 px | 200 / 4428.3 px | 0 / 630.9 px |
| Dense convergence | 120 / 79.5 px | 108 / 0 px | 142 / 125.8 px | 84 / 244.0 px |

All 24 geometry cases have zero overlapping cards and zero forward connectors through unrelated card interiors. Ordered ELK has two existing-peer order inversions in dense convergence; all other fixed cases have zero. The revised dense case has two additional incident crossings, the previous solver six, and ordered ELK seven. Incident crossings involve connectors sharing a node and are excluded from the table.

The revised solver's median measured preparation/layout/route time is 0.10–0.42 ms across the five timing fixtures; the original ELK configuration is about 7.6–48.6 ms. The ordered configuration has not received the same repeated timing experiment. See [layout-comparison.json](layout-comparison.json) and [layout-geometry.json](layout-geometry.json) for the complete observations and options.

## Sequential disclosure and tradeoffs

`npm run layout:sequences` exercises ten deterministic generic course graphs with variable card heights, shared topics, connections spanning columns, and selected loops. Both solvers receive the same sequence of up to fifteen expansions and three collapses, retaining their own prior layouts. There are 144 expansions and 30 collapses per solver.

| Observation | Previous expansion | Revised expansion | Previous collapse | Revised collapse |
| --- | ---: | ---: | ---: | ---: |
| Mean of per-step average movement | 72.1 px | 13.3 px | 79.0 px | 149.5 px |
| Largest existing-card movement | 1230.0 px | 705.5 px | 995.7 px | 1095.4 px |
| Existing-peer order inversions | 133 | 0 | 51 | 0 |
| Sum of non-incident crossings across states | 1543 | 1619 | 693 | 708 |
| Mean graph height | 1210.0 px | 1440.4 px | 1278.1 px | 1174.0 px |

Both solvers have zero overlapping cards and zero forward connectors through unrelated card interiors in this corpus. The revised solver reduces average expansion movement by about 82% and preserves peer order in every tested sequence. Its expansion layouts average about 19% taller and accumulate about 5% more crossings. Collapse moves cards farther to reclaim space, producing diagrams about 8% shorter on average. These costs are part of the decision, not hidden failures or proof of global optimality. Crossing totals recur across states and must not be read as unique defects.

Peer inversions now require the pair to share a column before and after a change. The earlier metric could count a reversal after a rank change separated the pair into different columns. Both solver results above use the corrected definition. Full sequences and per-state measurements are in [layout-sequences.json](layout-sequences.json).

## Browser evidence and limits

`browser/stability.spec.mjs` checks wide expansion at 1440 px and 390 px, collapse compaction, and expansion during another animation. Generic unit checks cover weighted packing, conflicting ordering constraints, the sequential corpus, and first-hop lane scores against independently measured geometry.

`node tools/stability-lab.mjs` uses the actual expansion button. The eight existing cards remain stationary relative to the expanded card at both viewport widths, within floating-point tolerance. The branch still supplies 100 readable choices. [stability-browser.json](stability-browser.json) records the observations; `stable-*` screenshots show before, expanded, and collapsed states. [The desktop motion capture](visuals/expansion-motion.webm) is provided for human review; it has not received a human quality rating.

Captions separately avoid cards and each other, prioritize the inspected connection, and use cached dimensions during motion. Explanations remain available in connection details. `node tools/caption-lab.mjs` measures rendered rectangles in three browsers, both themes, and two viewport widths. The narrow inspection pans to the caption corridor; overscan and viewport counts are separate. Overlay occlusion is not measured.

The subsequent [overlay review](OVERLAY_REVIEW.md) measures focused-card obstruction separately. It corrects topic-list placement and keyboard dismissal of Help and Settings, reducing intersecting focused-card states from twelve to zero in a 42-state generic corpus. Two actual-app expansions also pass. The chooser measures fixed controls on expansion and container resize, with an observed 1–6 ms setup cost in the paired groups. This does not extend the earlier caption corpus to caption/overlay occlusion.

The geometric comparison uses sharp centerlines reconstructed from current trunk/waypoint rules and ELK's returned orthogonal sections. It scores proper interior intersections and excludes collinear trunks, shared segment endpoints, rounded corners, arrowheads, stroke widths, captions, and residual backward connectors. It is not a complete visual-clutter score or a domain-route assessment.

Browser timing is separate: `node tools/render-lab.mjs` samples 600 ms around generic 25/100-child expansions without concurrent browser workloads. Consecutive animation-frame timestamps measure intervals; elapsed time to execution of the first callback is reported separately alongside synchronous setup. These observations do not establish when pixels reached a physical display. Physical devices and subjective motion quality still require human review.

The subsequent [expansion rendering review](EXPANSION_RENDERING_REVIEW.md) reduces setup through batched sizing, cached UI anchors, and effects allocated after visibility is known. Its paired 25/100/250-child experiment records both setup and first-callback timing. The pure solver and the geometry results above are unchanged by that rendering pass.

Ordered ELK remains better on dense crossing count, with greater card movement in the measured expansion. A runtime replacement would require integration with repeated instances, asynchronous cancellation, and a worker boundary. The present evidence favors continuity for incremental reading, not universal superiority over ELK.

## Primary documentation

- [ELK layered algorithm](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html)
- [Semi-interactive crossing minimization](https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-crossingMinimization-semiInteractive.html)
- [Force node model order](https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-crossingMinimization-forceNodeModelOrder.html)
- [Model-order strategy](https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-considerModelOrder-strategy.html)
- [ELK partitioning](https://eclipse.dev/elk/reference/options/org-eclipse-elk-partitioning-partition.html)
- [elkjs](https://github.com/kieler/elkjs)

The product decision is an inference from the local experiments, not a claim by ELK's maintainers.
