# TEST_ONLY technical media fixtures (POC-002)

These files are **synthetic technical test media only**. They contain no Lavish
product imagery, no customer marketing content and must never be registered in
`scenarios/catalog.json`, copied to `apps/web/public/`, or used as a scenario
video. They exist so the media verifier tests can exercise real HTTP, decode,
playback, seek, poster and WebVTT checks offline.

Provenance (2026-11-04): generated locally with the ffmpeg binary bundled by the
Python `imageio_ffmpeg` package (ffmpeg 7.1, libx264) from a plain colour source;
poster generated with Pillow; no external network, no rendering service, no
customer or reference video reuse.

| file | bytes | sha256 | purpose |
|---|---:|---|---|
| `good-1080x1920-15s.mp4` | 20,937 | `b41e789ad90d58644f00369dc520174413401d12a53df5727033a50e1323333f` | H.264/yuv420p 1080×1920, 15 s, no audio; good technical sample |
| `wrong-dimensions-640x360-15s.mp4` | 9,615 | `f0030bfe52ed957a1ccd87eb4e94f9a9f1325ef725c4b8ef2137083c8498ccb6` | 640×360 to test dimension mismatch |
| `wrong-duration-1080x1920-5s.mp4` | 9,992 | `04852d55e20ac382f73559b366a9892344efe098676819a6bd167a7b720d38b2` | 5 s to test duration mismatch |
| `corrupt-truncated.mp4` | 2,000 | `d898cc2d81cdc95179316445bcda456262d5417174d335d4bbe5e6452bf026eb` | first 2 KB of the good file; decode failure |
| `fake-png-as.mp4` | 12,248 | `5af047be9134cdf3c4ea404952e4c8d92d972cfaa7577604c8651d2feeb2f863` | PNG bytes renamed `.mp4`; MIME/signature failure |
| `poster-1080x1920.png` | 12,248 | `5af047be9134cdf3c4ea404952e4c8d92d972cfaa7577604c8651d2feeb2f863` | 1080×1920 technical poster |
| `good.vtt` | 166 | `bd937b1ae5738e04aa70d2a2e469865fedfaf07b6fc54838c722e00be814aabc` | in-range WebVTT cues (0–15 s) |
| `bad-range.vtt` | 78 | `b2a2e6f29e05cef3c6ab999b8846109171d47353d45e49cbf737bfbdfe7fc676` | cue ending at 20 s (outside video duration) |
| `wrong-text.vtt` | 157 | `891ffe54a1350031a17920435a98a9fbe8caabdfd6f4aae10f56a046df1be362` | correct timings, wrong text vs bound script |
| `missing-cue.vtt` | 114 | `d88554227ec2047551a986f91c89bc986c96c0cce1155a72ceca0b11ce5fcf99` | one cue missing (count mismatch) |
| `extra-cue.vtt` | 220 | `91214a5ebdb0ad9c91ab5a77685ed1686cd64137877f01156be5564ad82e2544` | extra cue (count mismatch) |
| `unordered.vtt` | 166 | `180ee708b5bb6d8d5f0b1c596f20eec0620efc052d8d20ebebb3b8e90f7a6412` | overlapping/unsorted cues |
| `wrong-language.vtt` | 201 | `a06e14eafb358b3056f08cc2d299ff7c814b5e122d6bb73d0ac4ac5531b6c91b` | Arabic text against the bound EN script version |
| `mixed-formats-extra.vtt` | 100 | `0c0754666b414a538882ec731bf04252fadf41c102b413bcd6d97b92d5e18565` | main-control two-cue case: HH:MM + MM:SS extra cue |
| `mixed-invalid-time.vtt` | 113 | `f75b91ad1189f4cec5e27fc77e9476798ec38ccfcc2091d2837c531e9cbe0fe8` | one valid cue + one invalid timing cue |
| `illegal-time-components.vtt` | 120 | `197adba1f3af785d7eae6afd83225ddd74e82052a9c53a4ba7a91d5ec0f895f4` | illegal minute component in a cue |
| `legal-noncue.vtt` | 307 | `09a6d164d703858b65518141110e4c86742fc425999d5acf4bec7509278abcc0` | WEBVTT header + NOTE/STYLE/REGION blocks + 3 legal cues |
| `unknown-block.vtt` | 106 | `1a9c21ff8918d753ecd525e743c0b4bf6bb40b8724b398aa602b86fa853a02d4` | non-cue unknown block that must be rejected |

The test server used by `tests/poc/media-validation.test.ts` serves these files
over local HTTP with Range support, plus deliberate 404/redirect/no-Range routes.
No real customer media has been received; real-scenario media verification is
NOT_RUN and must not be claimed as passing.
