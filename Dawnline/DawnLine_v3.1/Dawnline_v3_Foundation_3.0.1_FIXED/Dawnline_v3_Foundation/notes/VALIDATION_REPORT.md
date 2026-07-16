# Validation Report — 3.0.1

## Passed

- JavaScript bundle syntax check
- generated HTML inline-script parse checks
- required runtime-file presence and minimum-size checks
- no unpkg, jsDelivr, or raw GitHub runtime dependency
- correct local day, night, and cloud asset paths
- city dashboard absent
- all three textures present at 4096 × 2048
- untouched v1 and v2 originals included
- reproducible npm build completed using function-based HTML injection
- SHA-256 manifest generated

## Independent solar-altitude comparison

The v3 solar calculation was compared with the Astral 3.2 astronomy library with atmospheric refraction disabled.

| Test point | Dawnline | Astral | Difference |
|---|---:|---:|---:|
| West Chester, July 13 2026 12:00 UTC | 23.440° | 23.441° | 0.001° |
| London, March 20 2026 12:00 UTC | 38.422° | 38.422° | 0.000° |
| Sydney, December 21 2026 00:00 UTC | 63.221° | 63.219° | 0.002° |
| Tokyo, September 22 2026 21:00 UTC | 5.313° | 5.305° | 0.008° |
| Equator/Prime Meridian, June 21 2026 12:00 UTC | 66.561° | 66.558° | 0.003° |

Largest observed difference: approximately 0.008°.

## Browser-test boundary

The original 3.0.0 package failed because generated JavaScript did not parse in a browser. That defect is reproduced, identified, and corrected in 3.0.1. The rebuilt inline scripts now pass direct JavaScript parsing as part of the package validator.

The build environment still applies a Chromium administrator policy that blocks normal navigation to local files and localhost, so the target Windows machine remains the authoritative pixel-level visual acceptance environment.
