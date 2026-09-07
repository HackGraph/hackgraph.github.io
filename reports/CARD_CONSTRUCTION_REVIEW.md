# Card construction performance investigation — 7 September 2026 UTC

Two private optimization experiments were evaluated and rejected. The production renderer remains unchanged. The measurements do not support claiming a consistent improvement from either experiment.

The diagnostic profile separates graph resolution, DOM construction, sizing, placement, route updates and following the expanded branch. In the 250-topic fixture, the first layout read after building the topic list accounted for approximately 6.4 ms in Chromium and 4.3 ms in Firefox, averaged over three measured observations after warmup. The later geometry reads were inexpensive. The profile is diagnostic instrumentation, not an end-to-end benchmark.

Adding `contain: layout` to the graph world in a private stylesheet variant did not consistently reduce that first layout cost. It was not applied to the public stylesheet. CSS layout containment can isolate layout calculations, but its usefulness here must be demonstrated rather than assumed. [MDN documents its scope and containing-block effects](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain).

A second private variant cloned two static card structures, one for categories and one for other cards, and retained a direct toggle reference. Dataset strings still used `textContent`. The controlled comparison below used the uninstrumented renderers and unchanged CSS. No production refactor was adopted because the largest-case gains were small and the other results were mixed.

| Browser / children | Setup median, current → experiment | First callback median, current → experiment |
| --- | --- | --- |
| Chromium / 25 | 3.2 → 3.2 ms | 9.7 → 8.0 ms |
| Chromium / 100 | 8.8 → 9.2 ms | 10.8 → 13.0 ms |
| Chromium / 250 | 18.5 → 17.7 ms | 21.4 → 20.1 ms |
| Firefox / 25 | 8.5 → 8.0 ms | 16.5 → 15.5 ms |
| Firefox / 100 | 12 → 14 ms | 18 → 17.5 ms |
| Firefox / 250 | 25 → 24.5 ms | 26.5 → 26 ms |

[card-construction-timing.json](card-construction-timing.json) retains all 96 observations and both renderer hashes. Each browser ran four blocks in current/experiment/experiment/current order. Only one page was active at a time; each page was closed before opening the next. Each block tested 25, 100 and 250 children with four repetitions each. The first repetition of each count in each block is retained as warmup and excluded from the table, leaving six measured observations per browser/count/variant. Medians average the two middle values.

All 96 observations had zero consecutive animation-frame intervals above 34 ms; the largest sampled interval was 33.34 ms. The first-callback measurements include synchronous setup, but they do not measure physical pixel presentation or perceived smoothness. These local headless results do not establish phone performance, actual Safari behavior or human motion quality.

The production renderer hash remains `1cf73c7456480d25a54cba64aac3cceaf5b22b8e762a4344b10daa796750df51`; the rejected card-template experiment has hash `f845c8d6aab63707d9fe9bdc1175031f4b284594e604bfbd60668d455fdbce9e`. The private scripts and diagnostic profiles are in `.cache/choice-layout-review/`. The original [overlay timing](overlay-expansion-timing.json) and other earlier benchmarks retain their observations and source hashes. This investigation adds no content-review claims and does not close the broader review recorded in [COMPLETION_STATUS.md](COMPLETION_STATUS.md).
