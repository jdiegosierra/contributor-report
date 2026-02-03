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
│   ├── config.ts         # Configuration types
│   ├── metrics.ts        # Metric data structures
│   ├── scoring.ts        # Scoring result types
│   └── github.ts         # GitHub API types
├── config/               # Input parsing and defaults
│   ├── inputs.ts         # Parse action inputs
│   └── defaults.ts       # Default values and constants
├── api/                  # GitHub API client
│   ├── client.ts         # Octokit wrapper with rate limiting
│   ├── queries.ts        # GraphQL queries
│   └── rate-limit.ts     # Rate limit handling
├── metrics/              # Individual metric calculators
│   ├── pr-history.ts     # PR merge rate analysis
│   ├── repo-quality.ts   # Contributions to starred repos
│   ├── reactions.ts      # Comment reactions analysis
│   ├── account-age.ts    # Account age and consistency
│   ├── issue-engagement.ts # Issue engagement metrics
│   ├── code-review.ts    # Code review contributions
│   └── spam-detection.ts # Spam pattern detection
├── scoring/              # Score calculation
│   ├── engine.ts         # Main scoring aggregation
│   ├── decay.ts          # Time-based decay toward baseline
│   └── normalizer.ts     # Score normalization utilities
└── output/               # Output formatting
    ├── comment.ts        # PR comment generation
    └── formatter.ts      # Action output formatting
```

## Key Concepts

### Scoring System

- **Baseline**: 500/1000 (neutral)
- **Range**: 0-1000
- Each metric produces a normalized score (0-100) then applies weight
- Spam patterns apply additional penalties
- Scores decay toward baseline based on activity recency

### Testing Pattern (ESM Mocking)

```typescript
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { myFunction } = await import('../src/module.js')
```

### Build Pipeline

- Rollup bundles `src/index.ts` → `dist/index.js`
- **Critical**: The `dist/` directory must be committed with any `src/` changes
- The pre-commit hook automatically runs `pnpm bundle` and verifies `dist/` is up to date

## Repository Configuration

### Branch Protection (main)

- Requires 1 pull request review before merging
- Requires status checks to pass:
  - `Continuous Integration / TypeScript Tests`
  - `Lint Codebase / Lint Codebase`
- Requires conversation resolution before merging
- Requires linear history (squash merge only)
- Automatically deletes head branches after merge

### Tag Protection

- All tags matching `v*` pattern are protected from deletion and force-push
- Prevents accidental modification of release tags (v1.0.0, v1.0.1, etc.)
- Floating tags (v1, v2) can be updated by repository admins when needed

### Merge Strategy

- Only squash merge is allowed
- Keeps commit history clean and linear
- Each PR becomes a single commit on main

## Code Conventions

- Use `@actions/core` for logging (`core.debug()`, `core.info()`, etc.)
- Use `.js` extensions in imports (ESM requirement)
- Document functions with JSDoc comments
- Weights must sum to 1.0 for proper normalization
- Always run tests before committing: `pnpm test`
- Keep test coverage above 80%

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
2. Export a function that returns a `MetricResult`
3. Add it to `src/metrics/index.ts`
4. Add corresponding tests in `__tests__/metrics/`
5. Update the scoring engine in `src/scoring/engine.ts`
6. Add the metric to the table in README.md (Metrics section)
7. Add detailed documentation in README.md (Metric Details section) with:
   - What it measures
   - Why it matters
   - How it's calculated
   - How to improve
8. Add the metric to `formatMetricName()` in both:
   - `src/output/comment.ts` (for PR comments)
   - `src/output/formatter.ts` (for GitHub Actions summary)
   - Include display name and anchor link to documentation

## Troubleshooting

**Tests failing with ESM errors?**

- Ensure imports use `.js` extensions
- Use `jest.unstable_mockModule()` for mocking
- Import modules after mocking is set up

**dist/ out of sync?**

- The pre-commit hook automatically checks this when you modify `src/` files
- If you see an error, run `git add dist/` and commit again
- Manual check: `pnpm bundle && git status`
- The CI will also fail if `dist/` is not up to date

**Rate limits?**

- Use a personal access token with higher limits
- The action includes automatic rate limit handling
