# Release Process — CodeSense

CodeSense follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(`MAJOR.MINOR.PATCH`) and [Keep a Changelog](https://keepachangelog.com/).

## Current state

- Package version: `0.4.0` (`"version"` in `package.json`)
- Changelog: `CHANGELOG.md` — sections `[Unreleased]` plus one dated
  section per release, starting with `[0.1.0] - 2026-10-19`
- Target: `v1.0.0` after plan §9–§12 ships

## Version bump rules

### Pre-1.0 (`0.1.x`)

Before `v1.0.0` everything stays in the `0.1.x` line:

| Change type | Bump | Example |
|-------------|------|---------|
| Bug fix | PATCH | `0.4.0` → `0.4.1` |
| New feature / enhancement | MINOR (within `0.4`) | `0.4.x` → `0.4.(x+1)` |

No `MAJOR` bumps pre-1.0 — breaking changes are allowed inside the `0.1.x`
line without resetting to `1.0.0`.

### Post-1.0 (`v1.0.0` and beyond)

Once `v1.0.0` is tagged:

| Change type | Bump | Example |
|-------------|------|---------|
| Backwards-compatible bug fix | PATCH | `v1.0.0` → `v1.0.1` |
| Backwards-compatible new feature | MINOR | `v1.0.0` → `v1.1.0` |
| Breaking change | MAJOR | `v1.1.0` → `v2.0.0` |

## Bump checklist

1. Edit `"version"` in `package.json` to the new `MAJOR.MINOR.PATCH`.
2. In `CHANGELOG.md`:
   - Move everything under `[Unreleased]` into a new dated section,
     e.g. `## [0.1.1] - 2026-10-20`, keeping the Keep a Changelog subsections
     (Added / Changed / Deprecated / Removed / Fixed / Security).
   - Reset `[Unreleased]` to empty subsections.
3. Commit `package.json` and `CHANGELOG.md`.
4. Tag the commit: `git tag v0.4.1` and push tags.

Only the repo maintainer should cut a release; do not bump versions in feature branches.