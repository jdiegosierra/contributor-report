# PR Merge Rate

**What it measures:** The percentage of pull requests that get successfully merged versus those that are closed without
merging.

**Why it matters:** A low merge rate may indicate low-quality contributions, PRs that don't follow project guidelines,
or spam submissions. Contributors with consistently merged PRs demonstrate they understand project requirements and
deliver valuable contributions.

## How It's Calculated

```text
Merge Rate = Merged PRs / (Merged PRs + Closed Without Merge) × 100
```

- **Merged PRs:** PRs with state `MERGED`
- **Closed Without Merge:** PRs with state `CLOSED` (not merged)
- **Open PRs:** Not counted in the rate calculation but tracked for context

**Data Sources:**

- GitHub GraphQL API: `user.pullRequests` with `states: [MERGED, CLOSED, OPEN]`
- Only PRs created within the configured analysis window are considered

**Additional Data Tracked:**

- Average PR size (lines changed)
- Number of very short PRs (<10 lines) - potential spam indicator
- Dates of merged PRs for recency analysis

## Configuration

| Input                     | Default | Description                  |
| ------------------------- | ------- | ---------------------------- |
| `threshold-pr-merge-rate` | `0`     | Minimum merge rate (0-1)     |
| `analysis-window`         | `12`    | Months of history to analyze |

## Edge Cases

- If no PRs exist, the metric passes with value 0
- Open PRs are tracked but not included in rate calculation
- PRs to user's own repositories are included

## How to Improve

- Review contribution guidelines before submitting PRs
- Start with smaller, focused changes
- Respond to review feedback promptly
- Ensure tests pass before submitting
