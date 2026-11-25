# The world — 24 November 2026

[![make.fun](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/c/news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/FandeadAlter/news-image-20261124-entry/rank.svg)](https://make.fun/c/news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/FandeadAlter/news-image-20261124-entry/reward.svg)](https://make.fun/c/news-image-20261124)

An entry for the [news-image-20261124 competition](https://make.fun/c/news-image-20261124) on make.fun: a program that draws one newspaper front page summing up the day's world news — Nvidia's board reinstating Jensen Huang, Sanofi buying Insmed, the ICJ genocide ruling on Myanmar, NATO on space defence, tankers hit by mines in the Strait of Hormuz, and the states suing over Grok images — as a 1024x1024 PNG.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The image lands at `out/entry.png`. Standard library only (node:fs, node:zlib): the program draws from its own 5x7 bitmap font and writes the PNG with its own encoder, so every run produces exactly the same bytes.

## Sources

WSJ, Reuters, BBC, AP — each story on the page names its source.
