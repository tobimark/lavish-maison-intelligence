# Lavish AI Marketing POC — offline authored content draft

**Status: content-inbox / pending review / NOT runnable.**

The three scenarios contain a complete authored *future Mock replay storyline* and ten JSON files per scene, with linked 15-second EN and AR scripts, English/Arabic real text VTT, storyboards, simulated delivery fixture and actual originals of Lavish Logo and two sourced product photos. No external social API, runtime LLM, video production or email delivery was performed. All platform source signals are synthetic illustrative examples, not fake real posts.

## Package layouts

- `content-inbox/scent-layering/1.0.0/`
- `content-inbox/luxury-gifting/1.0.0/`
- `content-inbox/oud-storytelling/1.0.0/`

Each contains `manifest.json`, `brand.json`, `discovery.json`, `analysis.json`, `script.json`, `video.json`, `delivery.json`, `events.json`, `assets.json`, `expected.json` (ten JSON). Ancillary `CONTENT_REASONING.md`, `SCRIPT_EN.md`, `SCRIPT_AR.md`, `VIDEO_DELIVERY_BRIEF.md`, `MISSING_ASSETS.md`, `VALIDATION_NOTES.md`, `VALIDATION_REPORT.json` and a `media/` directory with actual logo, product images, EN/AR VTT files.

## Critical media honesty

Every scene is awaiting a customer-provided EN MP4 and corresponding poster. The two absent assets deliberately have `bytes:null`, `sha256:null`, `rightsStatus:"pending"` in `assets.json` to stop frozen runnable Schema acceptance. These are **six expected validation exceptions per scene** and should never be patched by invented hashes, empty files or unrelated footage. All video fields with dimensions, 15s and 30fps are **target specifications**, not measured properties. No AR video is claimed; AR VTT is for native review only.

The preset `delivery.simulated` record is authored **counterfactual Mock event data**, not proof of any sent email. Recipients are exclusively reserved `.invalid` addresses. `authoring.reviewStatus="pending"`. No scene has been marked reviewed, runnable or inserted into `scenarios/`/`catalog`.

## Offline static validation

Use Python 3 with `jsonschema` (optional but installed in the authoring environment):

```bash
python tools/validate_content.py --base content-inbox --schema contracts/poc/scenario.schema.json --report AUTHORING_VALIDATION_SUMMARY.json
```

Authoring static checks passed for all three scenes excluding the exactly six expected missing-media Schema properties per scene. This check does **not** run the project's real POC reducer/checkpoint comparator, media L5, browser, Playwright, ffprobe, video semantic review or actual delivery. See each `VALIDATION_REPORT.json` and `VALIDATION_NOTES.md`.

`tools/author_scenarios.py` is a reproducible source-authoring script; it requires the **original uploaded content kit extracted separately**, to retain verified source assets. Run with environment variables `LAVISH_INPUT_KIT=/path/to/extracted-kit` and `LAVISH_OUTPUT_DIR=/path/to/output`, then rerun static validation. Do not re-author a previously reviewed/released immutable scenario version without versioning.

## Astra handoff

1. Review three `CONTENT_REASONING.md` files, product facts, prohibited claims, EN/AR with native reviewer, and actual source-receipt evidence.
2. Wait for and inspect the actual MP4 and poster of each scenario. Verify exact script version, four shots, 15s and frame-level identity. Check rights.
3. Update actual media bytes/hashes/codec/frameRate and regenerate `manifest.json` hashes **only after real files exist**.
4. Execute project's own validator, L3 reducer replay, Playwright/media L5 and human approval. Only after those gates may Astra promote a new immutable package into the runtime catalog.

The frozen contract is included for independent checking; it was not edited. See `CONTRACT_QUESTIONS.md` for minor documentation/Schema wording differences.
