# MISSING ASSETS — The Thought Behind the Gift

This is a draft content handoff, **not** a runnable POC package. The following entries represent real missing files; no byte hashes or fake artifacts are supplied.

| assetId | Target file | Target URI | Requirement | Provider / owner | Status |
|---|---|---|---|---|---|
| `scn-luxury-gifting.asset.video-en` | `luxury-gifting-en-15s.mp4` | `/scenario-media/luxury-gifting/1.0.0/luxury-gifting-en-15s.mp4` | Actual 15s, 1080×1920 9:16, H.264/yuv420p, planned 30 fps, align all 4 EN shots and CTA; no forbidden product claims; AAC only if authorized | Customer later supplies matching MP4; Astra validates content | **MISSING / pending** |
| `scn-luxury-gifting.asset.poster-en` | `luxury-gifting-en-poster.jpg` | `/scenario-media/luxury-gifting/1.0.0/luxury-gifting-en-poster.jpg` | Actual matching JPEG poster, target 1080×1920, approved Lavish bottle and logo identities | Customer / approved production team, Astra reviews | **MISSING / pending** |

**No AR video is claimed.** Arabic VTT exists as a review text document but is not bound to the English video.

## Files actually present

- `scn-luxury-gifting.asset.logo` → `media/lavish-logo.png`; 114691 actual bytes; SHA-256 `f504781a6a6bbfd7f0f9a51ac077dc37e54c41dba96060667f38992d136f3966`.
- `scn-luxury-gifting.asset.oud` → `media/lavish-oud.jpg`; 123608 actual bytes; SHA-256 `d23108087a08aa9b90edee8b432b98b85b45eed5e4468464fef4880e328423c3`.
- `scn-luxury-gifting.asset.perla` → `media/perla-50ml-unisex.png`; 1554254 actual bytes; SHA-256 `5ba6a97c07081ce03c89acd7b7ca4ae701c1ee65e3b5cd4f96c873104830b724`.
- `scn-luxury-gifting.asset.vtt-en` → `media/luxury-gifting-en.vtt`; 338 actual bytes; SHA-256 `caab6b79ca579d9e99abd6efe20e25dad634e1bfca384dfd5ed310c90b6bc54a`.
- `scn-luxury-gifting.asset.vtt-ar` → `media/luxury-gifting-ar-review.vtt`; 362 actual bytes; SHA-256 `64484738fa3c8429fabde1ca3eac7c97d110f2518725427171718dfc1edfe9bb`.

## Before importing to runtime

1. Obtain actual assets; do not replace with stock footage, reference HTML video or test fixtures.
2. Verify frame-by-frame semantic match to this exact EN ScriptVersion and original Lavish packaging.
3. Probe actual duration, resolution, codec, frame rate, audio and rights; write actual bytes/hash, not projected values.
4. Update package files and manifest hashes; publish a new immutable version if content changes.
5. Have Astra perform content, media, reducer and browser checks; no acceptance is claimed here.
