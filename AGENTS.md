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
- **Critical**: Always run `pnpm bundle` after modifying `src/` - the `dist/` directory must be committed

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
5. Bundle for distribution: `pnpm bundle`
6. Commit changes (including `dist/` updates)
7. Open a PR against `main`

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
6. Document the metric in README.md

## Troubleshooting

**Tests failing with ESM errors?**

- Ensure imports use `.js` extensions
- Use `jest.unstable_mockModule()` for mocking
- Import modules after mocking is set up

**dist/ out of sync?**

- Run `pnpm bundle` after any `src/` changes
- The CI will fail if `dist/` is not up to date

**Rate limits?**

- Use a personal access token with higher limits
- The action includes automatic rate limit handling
