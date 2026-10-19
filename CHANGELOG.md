# CodeSense Changelog

All notable changes to CodeSense will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- None

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

## [0.1.2] - 2026-10-19

### Added
- None

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- Badge `severityVariant` "low" returned "secondary", which is not a
  valid Badge variant; now returns "default"
- Added missing `Store.applySuggest` type and implementation
  (Monaco `executeEdits` at editor cursor with null-safety)
- Added missing `provider.ts` exports: `PROVIDER_LABELS`,
  `detectProvider`, `readKeyOverride`, `demoResponse`; fixed null
  header handling with `?? undefined`

## [0.1.1] - 2026-10-19

### Added
- Strict JSON review output (§3.9): `review.json` schema with `enhancements`/`blockers`/`summary`
- `parse-review`: parsing and validation of LLM review output into structured results
- Thumbs up/down feedback on reviews in the Insight panel

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

## [0.1.0] - 2026-10-19

### Added
- Initial CodeSense release (pre-release / untracked until stabilized)
