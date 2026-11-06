# MISSING ASSETS — The Art of Scent Layering

This is a draft content handoff, **not** a runnable POC package. The following entries represent real missing files; no byte hashes or fake artifacts are supplied.

| assetId | Target file | Target URI | Requirement | Provider / owner | Status |
|---|---|---|---|---|---|
| `scn-scent-layering.asset.video-en` | `scent-layering-en-15s.mp4` | `/scenario-media/scent-layering/1.0.0/scent-layering-en-15s.mp4` | Actual 15s, 1080×1920 9:16, H.264/yuv420p, planned 30 fps, align all 4 EN shots and CTA; no forbidden product claims; AAC only if authorized | Customer later supplies matching MP4; Astra validates content | **MISSING / pending** |
| `scn-scent-layering.asset.poster-en` | `scent-layering-en-poster.jpg` | `/scenario-media/scent-layering/1.0.0/scent-layering-en-poster.jpg` | Actual matching JPEG poster, target 1080×1920, approved Lavish bottle and logo identities | Customer / approved production team, Astra reviews | **MISSING / pending** |

**No AR video is claimed.** Arabic VTT exists as a review text document but is not bound to the English video.

## Files actually present

- `scn-scent-layering.asset.logo` → `media/lavish-logo.png`; 114691 actual bytes; SHA-256 `f504781a6a6bbfd7f0f9a51ac077dc37e54c41dba96060667f38992d136f3966`.
- `scn-scent-layering.asset.oud` → `media/lavish-oud.jpg`; 123608 actual bytes; SHA-256 `d23108087a08aa9b90edee8b432b98b85b45eed5e4468464fef4880e328423c3`.
- `scn-scent-layering.asset.perla` → `media/perla-50ml-unisex.png`; 1554254 actual bytes; SHA-256 `5ba6a97c07081ce03c89acd7b7ca4ae701c1ee65e3b5cd4f96c873104830b724`.
- `scn-scent-layering.asset.vtt-en` → `media/scent-layering-en.vtt`; 343 actual bytes; SHA-256 `de813c11277d3c022f019af3a730813e3d944da1834b77e288d0481f1ba66d3f`.
- `scn-scent-layering.asset.vtt-ar` → `media/scent-layering-ar-review.vtt`; 386 actual bytes; SHA-256 `c53926f7bb644d3e58d91e6d5f72f510a917c648844176e48ed62e294832b259`.

## Before importing to runtime

1. Obtain actual assets; do not replace with stock footage, reference HTML video or test fixtures.
2. Verify frame-by-frame semantic match to this exact EN ScriptVersion and original Lavish packaging.
3. Probe actual duration, resolution, codec, frame rate, audio and rights; write actual bytes/hash, not projected values.
4. Update package files and manifest hashes; publish a new immutable version if content changes.
5. Have Astra perform content, media, reducer and browser checks; no acceptance is claimed here.
