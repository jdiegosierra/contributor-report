# Development Guide

## Project Overview

**Contributor Report** is a GitHub Action that evaluates PR contributor quality using objective GitHub metrics to combat
AI-generated spam PRs (also known as "AI slop" or "slop code"). It analyzes a contributor's GitHub activity history and
calculates scores based on PR merge rate, contributions to quality repositories, community engagement, and behavioral
patterns.

The goal is to help open source maintainers identify low-quality, spam, or AI-generated contributions that waste
maintainer time and resources, while being fair to legitimate contributors, especially newcomers.

## Common Commands

```bash
pnpm install          # Install dependencies
pnpm test             # Run tests
pnpm lint             # Run ESLint
pnpm bundle           # Format + package (run after changing src/)
pnpm run all          # Format, lint, test, coverage, and package
pnpm local-action     # Test action locally (requires .env file)
```

To run a single test file:

```bash
NODE_OPTIONS=--experimental-vm-modules NODE_NO_WARNINGS=1 pnpm exec jest __tests__/metrics/pr-history.test.ts
```

## Architecture

```text
src/
├── index.ts              # Entry point
├── main.ts               # Main action orchestration
├── types/                # TypeScript interfaces
│   ├── index.ts          # Re-exports all types
│   ├── config.ts         # Configuration types and defaults (MetricThresholds, FailAction, etc.)
│   ├── metrics.ts        # Metric data structures (10 data interfaces + AllMetricsData)
│   ├── scoring.ts        # Scoring result types (AnalysisResult, ActionOutput, ANALYSIS_CONSTANTS)
│   └── github.ts         # GitHub API response types (GraphQLContributorData, PRContext)
├── config/               # Input parsing and defaults
│   ├── index.ts          # Re-exports config functions
│   ├── inputs.ts         # Parse action inputs from env/action.yml
│   └── defaults.ts       # Default config, validation, VALID_METRIC_NAMES
├── api/                  # GitHub API client
│   ├── index.ts          # Re-exports API functions
│   ├── client.ts         # GitHubClient class (fetch, comment, label, PR context)
│   ├── queries.ts        # GraphQL queries (contributor data, org membership, rate limit)
│   └── rate-limit.ts     # Rate limit handling with exponential backoff (max 3 retries)
├── metrics/              # Individual metric calculators (extract + check pattern)
│   ├── index.ts          # Re-exports all metric functions
│   ├── pr-history.ts     # PR merge rate analysis
│   ├── repo-quality.ts   # Contributions to starred repos
│   ├── reactions.ts      # Comment reactions (positive + negative)
│   ├── account-age.ts    # Account age and activity consistency
│   ├── issue-engagement.ts # Issue engagement metrics
│   ├── code-review.ts    # Code review contributions
│   ├── merger-diversity.ts # Unique maintainers who merged PRs
│   ├── repo-history.ts   # Track record in specific repository
│   ├── profile-completeness.ts # GitHub profile richness (0-100 score)
│   └── suspicious-patterns.ts # Cross-metric spam detection (4 pattern types)
├── scoring/              # Score calculation
│   ├── index.ts          # Re-exports scoring functions
│   └── engine.ts         # Main scoring aggregation and evaluation
└── output/               # Output formatting
    ├── index.ts          # Re-exports output functions
    ├── comment.ts        # PR comment generation (full/passed/whitelist + verbose details)
    └── formatter.ts      # Action outputs, console ASCII table, and job summary
```

### Test & Fixture Structure

```text
__tests__/                # Test files (ESM with jest.unstable_mockModule)
├── api/
│   └── rate-limit.test.ts
├── config/
│   └── inputs.test.ts
├── metrics/
│   ├── account-age.test.ts
│   ├── code-review.test.ts
│   ├── issue-engagement.test.ts
│   ├── pr-history.test.ts
│   ├── reactions.test.ts
│   └── repo-quality.test.ts
├── scoring/
│   └── engine.test.ts
└── output/
    ├── comment.test.ts
    └── formatter.test.ts

__fixtures__/             # Test fixtures and mocks
├── core.ts               # Mocked @actions/core functions
├── github.ts             # Mocked @actions/github context
├── testData.ts           # Sample GraphQL responses for tests
└── api-responses/
    └── contributor-data.ts # Full API response fixtures

docs/metrics/             # Detailed metric documentation (12 markdown files)
```

**Test coverage gap:** The newer metrics (merger-diversity, repo-history, profile-completeness, suspicious-patterns) are
tested indirectly through `scoring/engine.test.ts` but lack dedicated test files in `__tests__/metrics/`.

## Key Concepts

### Metric Pattern

Each metric follows a consistent pattern:

```typescript
// 1. Extract data from GraphQL response
function extractXxxData(data: GraphQLContributorData, ...params): XxxData

// 2. Check against threshold
function checkXxx(data: XxxData, threshold: number): MetricCheckResult
```

**Available Metrics (13 total — 12 configurable + 1 auto):**

- `prMergeRate` - PR merge rate analysis
- `repoQuality` - Contributions to starred repos
- `positiveReactions` / `negativeReactions` - Community engagement
- `accountAge` / `activityConsistency` - Account maturity
- `issueEngagement` - Issue creation and engagement
- `codeReviews` - Code review contributions
- `mergerDiversity` - Unique maintainers who merged PRs
- `repoHistoryMergeRate` / `repoHistoryMinPRs` - Track record in specific repo
- `profileCompleteness` - GitHub profile richness
- `suspiciousPatterns` - Cross-metric spam detection (auto-fail on critical, no configurable threshold)

### Cross-Metric Analysis

The `suspiciousPatterns` metric is special - it analyzes data from multiple other metrics to detect spam patterns. It
runs after base metrics are extracted and can trigger automatic failure on critical patterns:

- `SPAM_PATTERN` - New account with high PR volume across many repos
- `HIGH_PR_RATE` - Excessive PR rate (>2 PRs/day average)
- `SELF_MERGE_ABUSE` - High self-merge rate on low-quality repos
- `REPO_SPAM` - Spam across many repos with low merge rate

Each pattern has a severity level (`CRITICAL` or `WARNING`). Critical patterns auto-fail the check.

### Testing Pattern (ESM Mocking)

```typescript
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

// IMPORTANT: Import modules AFTER mocking is set up
const { myFunction } = await import('../src/module.js')
```

### Build Pipeline

- Rollup bundles `src/index.ts` → `dist/index.js` (ES format with sourcemap)
- **Critical**: The `dist/` directory must be committed with any `src/` changes
- The pre-commit hook automatically runs `pnpm bundle` and verifies `dist/` is up to date
- If dist/ changes are detected, you must stage them: `git add dist/` and commit again

### Action Configuration

**22 inputs** including: `github-token` (required), 8 individual metric thresholds (or JSON `thresholds` object for all
12), `enable-spam-detection` (default: true), `required-metrics` (default: 'prMergeRate,accountAge'), `on-fail`
(comment|label|fail|comment-and-label|none), `verbose-details` (none|failed|all), `new-account-action`
(neutral|require-review|block), `dry-run`, `trusted-users`, `trusted-orgs`, and more.

**8 outputs**: `passed`, `passed-count`, `total-metrics`, `breakdown` (JSON), `recommendations` (JSON),
`is-new-account`, `has-limited-data`, `was-whitelisted`.

### Releases

Releases are automated via [Release Please](https://github.com/googleapis/release-please). On push to `main`:

1. Release Please scans conventional commits and creates/updates a release PR with CHANGELOG and version bump
2. When the release PR is merged, it creates a GitHub release + git tag (e.g., `v1.4.0`)
3. The workflow updates the floating major tag (`v1` → latest release)

**Only `feat:` and `fix:` commits trigger a release PR.** Other types (`docs:`, `ci:`, `refactor:`, etc.) are included
in the next release but don't trigger one on their own.

Configuration files:

- `release-please-config.json` — Release type (`node`), changelog path, tag format
- `.release-please-manifest.json` — Current version (updated automatically by Release Please)

## Repository Configuration

### Branch Protection (main)

- Requires 1 pull request review before merging
- Requires status checks to pass:
  - `Continuous Integration / TypeScript Tests`
  - `Lint Codebase / Lint Codebase`
- Requires conversation resolution before merging
- Requires linear history (squash merge only)
- Automatically deletes head branches after merge

### CI/CD Workflows (7 total)

- `ci.yml` - TypeScript tests (format check, lint, test) on PR and push to main
- `check-dist.yml` - Verifies dist/ is in sync with src/
- `linter.yml` - Super Linter (excludes dist/\*\*)
- `codeql-analysis.yml` - Security scanning
- `contributor-report.yml` - Self-test (runs the action on its own PRs)
- `dependabot-auto-merge.yml` - Auto-merge dependabot PRs
- `licensed.yml` - License compliance checks

### Tag Protection

- All tags matching `v*` pattern are protected from deletion and force-push
- Prevents accidental modification of release tags (v1.0.0, v1.0.1, etc.)
- Floating tags (v1, v2) can be updated by repository admins when needed

### Merge Strategy

- Only squash merge is allowed
- Keeps commit history clean and linear
- Each PR becomes a single commit on main

### File Structure Notes

- `CLAUDE.md` is a **symlink** to `AGENTS.md` — always edit `AGENTS.md` directly

## Code Conventions

- Use `@actions/core` for logging (`core.debug()`, `core.info()`, etc.)
- Use `.js` extensions in imports (ESM requirement)
- Document functions with JSDoc comments
- Weights must sum to 1.0 for proper normalization
- Always run tests before committing: `pnpm test`
- Keep test coverage above 80%
- Every directory has a barrel `index.ts` that re-exports from sibling modules

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes in `src/`
3. Add/update tests in `__tests__/`
4. Run the full test suite: `pnpm run all`
5. Commit changes: `git add . && git commit`
   - The pre-commit hook automatically runs `pnpm bundle` and verifies `dist/` is synced
   - If `dist/` changes are detected, stage them and commit again: `git add dist/ && git commit --amend --no-edit`
6. Open a PR against `main`
   - Requires 1 approval review
   - Must pass all status checks (CI, Linter)
   - Only squash merge is allowed

## Testing Locally

To test the action locally with real GitHub data:

1. Copy `.env.example` to `.env`
2. Add your GitHub token and test repository details
3. Run: `pnpm local-action`

## Adding New Metrics

1. Create new file in `src/metrics/your-metric.ts`
2. Define data interface in `src/types/metrics.ts` and add to `AllMetricsData`
3. Export `extractXxxData()` and `checkXxx()` functions
4. Add exports to `src/metrics/index.ts`
5. Add corresponding tests in `__tests__/metrics/`
6. Update the scoring engine in `src/scoring/engine.ts`:
   - Import new functions
   - Call `extractXxxData()` in `extractAllMetrics()`
   - Call `checkXxx()` in `checkAllMetrics()`
   - Add recommendation case in `generateRecommendations()`
7. Add threshold to `MetricThresholds` in `src/types/config.ts`
8. Add default value to `DEFAULT_THRESHOLDS` in `src/types/config.ts`
9. Add metric name to `VALID_METRIC_NAMES` in `src/config/defaults.ts`
10. Add input parsing in `src/config/inputs.ts`
11. Add input definition in `action.yml`
12. Add the metric to the table in README.md (Metrics section)
13. Add detailed documentation in `docs/metrics/your-metric.md` with:
    - What it measures
    - Why it matters
    - How it's calculated
    - How to improve
14. Add the metric to `formatMetricName()` in both:
    - `src/output/comment.ts` (for PR comments)
    - `src/output/formatter.ts` (for GitHub Actions summary)
    - Include display name and anchor link to documentation
15. Add verbose detail formatter in `src/output/comment.ts` (`formatVerboseDetails()` switch)

**Note:** Some metrics need additional context:

- Metrics analyzing repo-specific data need `prContext: PRContext` parameter
- Cross-metric analysis (like `suspiciousPatterns`) should extract after base metrics

## Troubleshooting

**Tests failing with ESM errors?**

- Ensure imports use `.js` extensions
- Use `jest.unstable_mockModule()` for mocking
- Import modules after mocking is set up (dynamic `await import()`)

**dist/ out of sync?**

- The pre-commit hook automatically checks this when you modify `src/` files
- If you see an error, run `git add dist/` and commit again
- Manual check: `pnpm bundle && git status`
- The CI (`check-dist.yml`) will also fail if `dist/` is not up to date

**Rate limits?**

- Use a personal access token with higher limits
- The action includes automatic rate limit handling with exponential backoff (max 3 retries)
