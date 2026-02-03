# Repo History

**What it measures:** Your track record of contributions in the specific repository where the PR is being submitted.

**Why it matters:** Contributors with a history of successful contributions to a specific repository have demonstrated
they understand the project's guidelines and standards. First-time contributors have no track record yet.

## Metrics

This file documents two related metrics:

### Repo History Merge Rate

The percentage of your PRs to this specific repository that were merged.

```text
Repo Merge Rate = Merged PRs in Repo / (Merged + Closed) PRs in Repo
```

### Repo History Min PRs

The total number of PRs you've previously submitted to this repository.

```text
Repo Min PRs = Total previous PRs in this repository
```

## Data Sources

- GitHub GraphQL API: `search(type: ISSUE)` for PRs by user in specific repo
- Repository context from the current PR event

**Additional Data Tracked:**

- Repository name (owner/repo format)
- Merged PRs count in this repo
- Closed (not merged) PRs count in this repo
- First-time contributor flag

## Configuration

| Input                               | Default | Description                           |
| ----------------------------------- | ------- | ------------------------------------- |
| `threshold-repo-history-merge-rate` | `0`     | Minimum merge rate in this repo (0-1) |
| `threshold-repo-history-min-prs`    | `0`     | Minimum previous PRs in this repo     |

## First-Time Contributors

If a contributor has no previous PRs to the repository, they are flagged as a first-time contributor. This can be used
to:

- Welcome new contributors appropriately
- Apply different review standards
- Trigger manual review processes

## Edge Cases

- Deleted PRs are not counted
- PRs from before the analysis window may still be counted (repo-specific)
- Draft PRs are not counted until converted to ready for review

## How to Improve

- Build a track record by starting with small contributions
- Follow the repository's contribution guidelines
- Respond to review feedback promptly and respectfully
- Learn from rejected PRs to improve future submissions
