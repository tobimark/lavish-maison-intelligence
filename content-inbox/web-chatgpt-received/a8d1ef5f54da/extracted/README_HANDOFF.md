# Lavish SERENITY A 1.1.0 · Authoring Handoff

This is an **authored-content DRAFT** for Codex Astra review and the existing DeepSeek/DSH implementation session, NOT a runnable/accepted package.

## Deliverables
- **Exactly ten JSON** files at `content-inbox/scent-layering/1.1.0/`: manifest, brand, discovery, analysis, script, video, delivery, events, assets, expected. SchemaVersion 1.0.0 remains frozen; scenarioVersion 1.1.0.
- Scenario documents `CONTENT_REASONING.md`, `SCRIPT_EN.md`, `SCRIPT_AR.md`, `VIDEO_RELATIONSHIP.md`, `CHANGELOG.md`, `MISSING_ASSETS.md`, `VALIDATION_NOTES.md`.
- Actual local media `scenario-media/scent-layering/1.1.0/`: 2 SERENITY images (copy), existing logo (copy), EN/AR concept VTT (new).
- **Unchanged provided assets** in `provided-assets/scent-layering/1.0.0/`: hero, original identity, 10.08s MP4. No video regeneration/transcoding.
- **Unchanged sidecar** in `design/presentation-assets/scent-layering.json` linking to `scenarioVersion=1.1.0`. Keep `contentStatus=awaiting_serenity_content` pending Astra content binding approval.
- `evidence/A_1.1.0_AUTHOR_VALIDATION_REPORT.json` is outside the content-inbox scenario directory to preserve exactly ten JSON contract files.
- Frozen `contracts/` and supporting `docs/` are references, **do not edit**.

## Key integration warning
The 15s `video.json` is planned and has no MP4/poster. The real 10.08s, 3:4 MP4 is a separate provided preview via sidecar. Do **not** attach the 15s EN/AR VTT to the 10.08s MP4; do **not** use its bytes/hash to satisfy the 15s frozen video entry.

## Status
`authoring.reviewStatus=pending` and the package is **not accepted / not runnable**. Expected strict Schema errors: six in planned media `bytes`, `sha256`, and `rightsStatus`. Other static checks summarized in validation report. Domain reducer/checkpoint replay, runtime browser, package binding and FAST_06 central acceptance are **NOT_RUN** here; Astra must execute them in the engineering repository.

**Do not modify DSH's previously accepted homepage or imply FAST_06 accepted.**
