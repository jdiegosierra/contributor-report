# Merger Diversity

**What it measures:** The number of unique maintainers who have merged your pull requests.

**Why it matters:** Having PRs merged by multiple different maintainers indicates broader trust and acceptance in the
community. If all PRs are self-merged, it may indicate contributions only to personal projects.

## How It's Calculated

```text
Merger Diversity = Count of unique users who merged your PRs
```

**Data Sources:**

- GitHub GraphQL API: `user.pullRequests.nodes[].mergedBy.login`
- For each merged PR, identifies who performed the merge

**Additional Data Tracked:**

- Self-merge count (you merged your own PR)
- Self-merges on own repositories
- Self-merges on external repositories (you have merge rights)
- External repos where you have merge privilege
- List of all merger usernames
- Self-merge rate (self-merges / total merges)

## Red Flags

The metric detects a red flag when:

- All merges are self-merges on user's own repositories
- This indicates no external validation of contributions

## Configuration

| Input                        | Default | Description                     |
| ---------------------------- | ------- | ------------------------------- |
| `threshold-merger-diversity` | `0`     | Minimum unique mergers required |

## Edge Cases

- PRs merged by bots count (e.g., mergify)
- Self-merges on external repos indicate trust (you have merge rights)
- Deleted users show as null mergers

## How to Improve

- Contribute to projects where others will review and merge your work
- Build relationships with maintainers through quality contributions
- Start with smaller contributions to establish trust
- Participate in code reviews to become a trusted maintainer yourself
