# Contributor Report

[![CI](https://github.com/jdiegosierra/contributor-report/actions/workflows/ci.yml/badge.svg)](https://github.com/jdiegosierra/contributor-report/actions/workflows/ci.yml)
[![Linter](https://github.com/jdiegosierra/contributor-report/actions/workflows/linter.yml/badge.svg)](https://github.com/jdiegosierra/contributor-report/actions/workflows/linter.yml)
[![Check dist/](https://github.com/jdiegosierra/contributor-report/actions/workflows/check-dist.yml/badge.svg)](https://github.com/jdiegosierra/contributor-report/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/jdiegosierra/contributor-report/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/jdiegosierra/contributor-report/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A GitHub Action that analyzes PR contributors and generates detailed quality reports using objective GitHub metrics to
help combat AI-generated spam PRs (AI slop) in open source projects.

## The Problem

Open source maintainers are increasingly facing a flood of low-quality, AI-generated pull requests (commonly known as
"AI slop" or "slop code"). These spam PRs waste maintainer time and resources, cluttering repositories with
minimal-value contributions. This action helps by analyzing the PR author's contribution history using objective metrics
to identify potential spam or low-effort AI-generated contributions.

## How It Works

When a PR is opened, this action:

1. Fetches the contributor's GitHub activity from the past 12 months
2. Evaluates each metric against configurable thresholds
3. Generates a detailed report as a PR comment with:
   - ✅/❌ Overall status indicator
   - Individual metric results in a table format
   - Pass/fail status for each metric with thresholds
   - Personalized recommendations for improvement
   - Special handling for new accounts and limited data

**Example report:**

```markdown
## ✅ Contributor Report

**User:** @contributor **Status:** Passed (7/8 metrics passed)

### Metric Results

| Metric               | Value | Threshold | Status |
| -------------------- | ----- | --------- | ------ |
| PR Merge Rate        | 45%   | >= 30%    | ✅     |
| Account Age          | 120d  | >= 30d    | ✅     |
| Positive Reactions   | 15    | >= 5      | ✅     |
| Negative Reactions   | 1     | <= 5      | ✅     |
| Repo Quality         | 3     | >= 2      | ✅     |
| Activity Consistency | 60%   | >= 50%    | ✅     |
| Issue Engagement     | 2     | >= 1      | ✅     |
| Code Reviews         | 0     | >= 1      | ❌     |

### Recommendations

- Consider reviewing code from other contributors to build reputation
```

> [!TIP] **See it in action:** Check out [PR #5](https://github.com/jdiegosierra/contributor-report/pull/5) for a live
> example of the Contributor Report in action.

## Why Reports Instead of Scores?

Some tools assign contributors a single numeric score (e.g., "45/100" or "Safe/Caution" badges). While this seems
convenient, **Contributor Report** takes a different approach by providing detailed, transparent reports. Here's why:

### Numeric Scores Hide Important Context

A score like "45/100 - Review Carefully" doesn't tell you:

- **Which specific metrics failed** or why
- **What to review** or what concerns exist
- **How the contributor can improve**
- **Why the threshold was set at that number**

### Reports Provide Transparency & Fairness

Open source values transparency. Contributors deserve to see:

- Exactly what metrics were evaluated
- The actual values vs required thresholds
- Clear, actionable recommendations
- Fair handling of new accounts and limited data

### Every Project is Different

A one-size-fits-all score assumes all projects value the same things. But:

- A documentation project may not care about code reviews
- A security-critical project might require high review activity
- An experimental project might welcome new contributors with limited history

**Detailed reports let you configure thresholds** that match your project's needs and make informed decisions based on
your own standards.

### Information, Not Judgment

This action doesn't claim to know if someone is "good" or "bad". Instead, it provides **objective data and clear
metrics** so maintainers can make informed decisions. It's the difference between:

- ❌ "This PR author scores 45/100" (black-box judgment)
- ✅ "This PR author has these metrics, here's what they mean, you decide" (transparent information)

### Metrics

| Metric                                                       | Description                                     | Default Threshold |
| ------------------------------------------------------------ | ----------------------------------------------- | ----------------- |
| [PR Merge Rate](docs/metrics/pr-merge-rate.md)               | Percentage of PRs that get merged vs closed     | >= 0%             |
| [Account Age](docs/metrics/account-age.md)                   | Age of the GitHub account                       | >= 0 days         |
| [Positive Reactions](docs/metrics/positive-reactions.md)     | Positive reactions received on comments/issues  | >= 0              |
| [Negative Reactions](docs/metrics/negative-reactions.md)     | Negative reactions received (maximum allowed)   | <= 0              |
| [Repo Quality](docs/metrics/repo-quality.md)                 | Contributions to repos with stars               | >= 0              |
| [Activity Consistency](docs/metrics/activity-consistency.md) | Regular activity over time                      | >= 0%             |
| [Issue Engagement](docs/metrics/issue-engagement.md)         | Issues created that receive engagement          | >= 0              |
| [Code Reviews](docs/metrics/code-reviews.md)                 | Code reviews given to others                    | >= 0              |
| [Merger Diversity](docs/metrics/merger-diversity.md)         | Unique maintainers who merged contributor's PRs | >= 0              |
| [Repo History](docs/metrics/repo-history.md)                 | Track record in the specific repository         | >= 0              |
| [Profile Completeness](docs/metrics/profile-completeness.md) | GitHub profile richness (bio, followers, etc.)  | >= 0              |
| [Suspicious Patterns](docs/metrics/suspicious-patterns.md)   | Detection of spam-like activity patterns        | N/A (auto)        |

> **Learn more:** See the [Metric Documentation](docs/metrics/) for detailed explanations of each metric, including how
> they're calculated and how to improve them.

## Usage

> **Note**: All metric thresholds default to `0`, making the action permissive by default. Configure stricter thresholds
> based on your project's needs.

### Basic Usage

```yaml
name: PR Contributor Check

on:
  pull_request:
    types: [opened, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  check-contributor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check Contributor Report
        uses: jdiegosierra/contributor-report@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Configuration

```yaml
- name: Check Contributor Quality
  uses: jdiegosierra/contributor-report@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

    # Individual thresholds (defaults are 0, override as needed)
    threshold-pr-merge-rate: '0.3' # Require 30% merge rate
    threshold-account-age: '30' # Require 30+ day old accounts
    threshold-positive-reactions: '1' # Require at least 1 positive reaction
    threshold-negative-reactions: '5' # Allow max 5 negative reactions
    threshold-merger-diversity: '2' # Require 2+ unique maintainers who merged PRs
    threshold-repo-history-merge-rate: '0.3' # Require 30% merge rate in this repo
    threshold-repo-history-min-prs: '1' # Require at least 1 previous PR in repo
    threshold-profile-completeness: '20' # Require profile completeness score >= 20

    # Spam detection (enabled by default)
    enable-spam-detection: 'true'

    # Metrics that must pass (comma-separated)
    required-metrics: 'prMergeRate,accountAge'

    # Minimum stars for "quality" repos
    minimum-stars: '50'

    # Analysis window in months
    analysis-window: '12'

    # Trusted users (always pass)
    trusted-users: 'dependabot[bot],renovate[bot],my-bot'

    # Trusted organizations
    trusted-orgs: 'my-org,partner-org'

    # Action on fail: comment, label, fail, comment-and-label, none
    on-fail: 'comment-and-label'

    # Label to apply
    label-name: 'needs-review'

    # Test mode - log but don't act
    dry-run: 'false'

    # New account handling: neutral, require-review, block
    new-account-action: 'require-review'

    # Days threshold for "new" accounts
    new-account-threshold-days: '14'
```

## Inputs

| Input                               | Required | Default                  | Description                           |
| ----------------------------------- | -------- | ------------------------ | ------------------------------------- |
| `github-token`                      | Yes      | `${{ github.token }}`    | GitHub token for API access           |
| `thresholds`                        | No       | `{}`                     | JSON object with custom thresholds    |
| `threshold-pr-merge-rate`           | No       | `0`                      | Minimum PR merge rate (0-1)           |
| `threshold-account-age`             | No       | `0`                      | Minimum account age in days           |
| `threshold-positive-reactions`      | No       | `0`                      | Minimum positive reactions            |
| `threshold-negative-reactions`      | No       | `0`                      | Maximum negative reactions            |
| `threshold-merger-diversity`        | No       | `0`                      | Minimum unique maintainers who merged |
| `threshold-repo-history-merge-rate` | No       | `0`                      | Minimum merge rate in this repo (0-1) |
| `threshold-repo-history-min-prs`    | No       | `0`                      | Minimum previous PRs in this repo     |
| `threshold-profile-completeness`    | No       | `0`                      | Minimum profile completeness (0-100)  |
| `enable-spam-detection`             | No       | `true`                   | Enable suspicious pattern detection   |
| `required-metrics`                  | No       | `prMergeRate,accountAge` | Metrics that must pass                |
| `minimum-stars`                     | No       | `100`                    | Min stars for quality repos           |
| `analysis-window`                   | No       | `12`                     | Months of history to analyze          |
| `trusted-users`                     | No       | Common bots              | Comma-separated whitelist             |
| `trusted-orgs`                      | No       | -                        | Comma-separated org whitelist         |
| `on-fail`                           | No       | `comment`                | Action when check fails               |
| `label-name`                        | No       | `needs-review`           | Label to apply                        |
| `dry-run`                           | No       | `false`                  | Log only, no actions                  |
| `new-account-action`                | No       | `neutral`                | Handling for new accounts             |
| `new-account-threshold-days`        | No       | `30`                     | Days to consider "new"                |

## Outputs

| Output             | Description                            |
| ------------------ | -------------------------------------- |
| `passed`           | Whether all required metrics passed    |
| `passed-count`     | Number of metrics that passed          |
| `total-metrics`    | Total number of metrics evaluated      |
| `breakdown`        | JSON with detailed metric breakdown    |
| `recommendations`  | JSON array of improvement suggestions  |
| `is-new-account`   | Whether account is below age threshold |
| `has-limited-data` | Whether analysis had limited data      |
| `was-whitelisted`  | Whether user was on trusted list       |

## Using Outputs

```yaml
- name: Check Contributor Report
  id: contributor-check
  uses: jdiegosierra/contributor-report@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Handle result
  if: steps.contributor-check.outputs.passed == 'false'
  run: |
    echo "Passed: ${{ steps.contributor-check.outputs.passed }}"
    echo "Metrics: ${{ steps.contributor-check.outputs.passed-count }}/\
${{ steps.contributor-check.outputs.total-metrics }}"
```

## Default Trusted Users

These bots are trusted by default:

- `dependabot[bot]`
- `renovate[bot]`
- `github-actions[bot]`
- `codecov[bot]`
- `sonarcloud[bot]`

Override with an empty string to disable: `trusted-users: ''`

## Fair Treatment

This action is designed to be fair:

- **New users are not penalized** - Configurable handling for new accounts
- **Limited data = neutral** - Not enough data doesn't mean low quality
- **Configurable thresholds** - Adjust for your project's needs
- **Whitelist support** - Trust known good actors
- **Dry run mode** - Test before enabling

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Lint
pnpm lint

# Build
pnpm bundle
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
