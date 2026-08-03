<div align="center">

# HackGraph

Interactive attack-path explorer for offensive security.

[![Live](https://img.shields.io/badge/live-hackgraph.github.io-f04450)](https://hackgraph.github.io/)
[![Deploy](https://github.com/HackGraph/hackgraph.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/HackGraph/hackgraph.github.io/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

### [hackgraph.github.io](https://hackgraph.github.io/)

<img src=".github/preview.png" alt="The Active Directory map: DCSync selected, its panel open, and the four techniques it leads to" width="900">

</div>

Start from a foothold and expand one technique at a time toward Domain Admin, SYSTEM or root. It runs entirely in the browser.

## Run locally

There is no build step and nothing to install. The repository is the site, so serve the
directory with whatever you already have and open <http://localhost:5173>:

```bash
python3 -m http.server 5173
```

Node is only needed for the checks:

```bash
node --test                    # content lint, adapter tests, engine tests
node tools/gen-reference.mjs   # rebuild the reference pages after a content change
node tools/check-refs.mjs      # check every reference URL still resolves
```

## Contributing

Maps are plain data in `src/data/`. Adding a technique means editing those files and nothing else. A whole new map also needs an entry in `META` in `tools/gen-reference.mjs`, so it gets a reference page; the app itself picks it up on its own.

Before opening a PR run `node --test`, and `node tools/gen-reference.mjs` if you touched content.

## Acknowledgements

The mindmap format was inspired by the [Orange Cyberdefense mindmaps](https://github.com/Orange-Cyberdefense/ocd-mindmaps). The techniques lean on these projects, cited throughout:

- [HackTricks](https://book.hacktricks.wiki/)
- [The Hacker Recipes](https://www.thehacker.recipes/)
- [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings)
- [BloodHound and SpecterOps research](https://bloodhound.specterops.io/)
- [GTFOBins](https://gtfobins.github.io/) and [LOLBAS](https://lolbas-project.github.io/)

Every technique also links its own primary sources and credits the tools it uses.

## License

[MIT](LICENSE). For authorized security testing, CTFs, and learning.
