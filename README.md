# Contributor Report

[![CI](https://github.com/jdiegosierra/contributor-report/actions/workflows/ci.yml/badge.svg)](https://github.com/jdiegosierra/contributor-report/actions/workflows/ci.yml)
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
3. Generates a detailed report with metric breakdown and recommendations
4. Posts the report as a PR comment (or labels/fails based on configuration)

> [!TIP] **See it in action:** Check out [PR #5](https://github.com/jdiegosierra/contributor-report/pull/5) for a live
> example of the Contributor Report in action, showing the detailed analysis and report format.

## Report Example

The action posts a detailed comment on each PR with:

- ✅/❌ Overall status indicator
- Individual metric results in a table format
- Pass/fail status for each metric with thresholds
- Personalized recommendations for improvement
- Special handling for new accounts and limited data

Example report:

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

| Metric               | Description                                    | Default Threshold |
| -------------------- | ---------------------------------------------- | ----------------- |
| PR Merge Rate        | Percentage of PRs that get merged vs closed    | >= 0%             |
| Account Age          | Age of the GitHub account                      | >= 0 days         |
| Positive Reactions   | Positive reactions received on comments/issues | >= 0              |
| Negative Reactions   | Negative reactions received (maximum allowed)  | <= 0              |
| Repo Quality         | Contributions to repos with stars              | >= 0              |
| Activity Consistency | Regular activity over time                     | >= 0%             |
| Issue Engagement     | Issues created that receive engagement         | >= 0              |
| Code Reviews         | Code reviews given to others                   | >= 0              |

## Metric Details

### PR Merge Rate

**What it measures:** The percentage of pull requests that get successfully merged versus those that are closed without
merging.

**Why it matters:** A low merge rate may indicate low-quality contributions, PRs that don't follow project guidelines,
or spam submissions. Contributors with consistently merged PRs demonstrate they understand project requirements and
deliver valuable contributions.

**How it's calculated:** (Merged PRs / Total PRs) × 100. Only PRs from the configured analysis window are considered.

**How to improve:**

- Review contribution guidelines before submitting PRs
- Start with smaller, focused changes
- Respond to review feedback promptly
- Ensure tests pass before submitting

### Account Age

**What it measures:** How long the GitHub account has existed (in days).

**Why it matters:** Very new accounts (< 30 days) submitting PRs may warrant additional scrutiny, as they're sometimes
associated with spam campaigns or AI-generated contributions. However, everyone starts somewhere, so this metric should
be used thoughtfully.

**How it's calculated:** Days between account creation date and current date.

**How to improve:** This metric improves naturally over time as your account ages.

### Positive Reactions

**What it measures:** The total number of positive reactions (👍, ❤️, 🎉, 🚀) received on your comments, issues, and PR
reviews.

**Why it matters:** Positive community engagement indicates that your contributions are helpful and well-received. This
metric reflects how you interact with others in the community.

**How it's calculated:** Sum of all positive reaction types across your comments, issues, and PR reviews.

**How to improve:**

- Provide helpful, constructive feedback in code reviews
- Write clear, detailed issue reports
- Share useful insights in discussions
- Be respectful and supportive of other contributors

### Negative Reactions

**What it measures:** The total number of negative reactions (👎, 😕) received on your comments, issues, and PR reviews.

**Why it matters:** A high number of negative reactions may indicate problematic behavior, unhelpful contributions, or
communication issues. This is a maximum threshold - you should stay below it.

**How it's calculated:** Sum of negative reaction types (👎, 😕) across your comments, issues, and PR reviews.

**How to improve:**

- Be respectful and constructive in all interactions
- Avoid spam or low-effort comments
- Focus on helpful, relevant contributions
- Follow project codes of conduct

### Repo Quality

**What it measures:** The number of repositories (with a minimum star count) where you've had PRs successfully merged.

**Why it matters:** Contributing to established, popular repositories demonstrates that you can meet higher quality
standards and work with larger communities. It helps distinguish between genuine contributors and spam accounts.

**How it's calculated:** Count of unique repositories (meeting the minimum stars threshold) where you have merged PRs.
Default minimum is 100 stars, but this is configurable.

**How to improve:**

- Contribute to well-maintained open source projects
- Focus on quality over quantity
- Build a track record with established projects
- Find projects that align with your interests and skills

### Activity Consistency

**What it measures:** How regularly you're active on GitHub over the analysis period.

**Why it matters:** Consistent activity over time indicates a genuine contributor rather than a temporary or spam
account. Real developers typically have ongoing GitHub activity, while spam accounts often show sudden bursts of
activity.

**How it's calculated:** Percentage of months (within the analysis window) where you had at least one contribution (PR,
issue, or review).

**How to improve:**

- Contribute regularly to projects you care about
- Maintain consistent involvement over time
- Even small contributions help demonstrate consistency

### Issue Engagement

**What it measures:** The number of issues you've created that received community engagement (comments from others).

**Why it matters:** Creating issues that spark discussion shows you're identifying real problems and communicating them
effectively. Engaged issues indicate thoughtful contributions rather than spam.

**How it's calculated:** Count of issues you've created that have at least one comment from another user.

**How to improve:**

- Create well-researched, detailed issue reports
- Provide clear reproduction steps for bugs
- Propose thoughtful feature requests with use cases
- Engage constructively in issue discussions

### Code Reviews

**What it measures:** The number of meaningful code reviews you've provided on other people's pull requests.

**Why it matters:** Providing code reviews demonstrates engagement with the community and technical understanding.
Reviewers who help others improve their code are valuable contributors. Spam accounts rarely engage in code review.

**How it's calculated:** Count of non-trivial review comments you've made on PRs (excluding your own PRs).

**How to improve:**

- Review PRs in projects you're familiar with
- Provide constructive, helpful feedback
- Look for opportunities to help other contributors
- Share your knowledge and expertise

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

| Input                          | Required | Default                  | Description                        |
| ------------------------------ | -------- | ------------------------ | ---------------------------------- |
| `github-token`                 | Yes      | `${{ github.token }}`    | GitHub token for API access        |
| `thresholds`                   | No       | `{}`                     | JSON object with custom thresholds |
| `threshold-pr-merge-rate`      | No       | `0`                      | Minimum PR merge rate (0-1)        |
| `threshold-account-age`        | No       | `0`                      | Minimum account age in days        |
| `threshold-positive-reactions` | No       | `0`                      | Minimum positive reactions         |
| `threshold-negative-reactions` | No       | `0`                      | Maximum negative reactions         |
| `required-metrics`             | No       | `prMergeRate,accountAge` | Metrics that must pass             |
| `minimum-stars`                | No       | `100`                    | Min stars for quality repos        |
| `analysis-window`              | No       | `12`                     | Months of history to analyze       |
| `trusted-users`                | No       | Common bots              | Comma-separated whitelist          |
| `trusted-orgs`                 | No       | -                        | Comma-separated org whitelist      |
| `on-fail`                      | No       | `comment`                | Action when check fails            |
| `label-name`                   | No       | `needs-review`           | Label to apply                     |
| `dry-run`                      | No       | `false`                  | Log only, no actions               |
| `new-account-action`           | No       | `neutral`                | Handling for new accounts          |
| `new-account-threshold-days`   | No       | `30`                     | Days to consider "new"             |

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
