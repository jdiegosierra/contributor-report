# Repo Quality

**What it measures:** The number of repositories (with a minimum star count) where you've had PRs successfully merged.

**Why it matters:** Contributing to established, popular repositories demonstrates that you can meet higher quality
standards and work with larger communities. It helps distinguish between genuine contributors and spam accounts.

## How It's Calculated

```text
Quality Repo Count = Number of unique repos with (stars >= minimum_stars AND merged_prs > 0)
```

**Data Sources:**

- GitHub GraphQL API: `user.pullRequests` with `states: [MERGED]`
- Repository star count from `repository.stargazerCount`

**Additional Data Tracked:**

- Full list of contributed repositories with star counts
- Average stars across all contributed repos
- Highest star count among contributed repos
- Merged PR count per repository

## Configuration

| Input                    | Default | Description                                    |
| ------------------------ | ------- | ---------------------------------------------- |
| `minimum-stars`          | `100`   | Minimum stars for a repo to count as "quality" |
| `thresholds.repoQuality` | `0`     | Minimum quality repos required                 |

## Edge Cases

- Repositories that have been deleted or made private are excluded
- Forks are included if they have their own star count
- User's own repositories are included

## How to Improve

- Contribute to well-maintained open source projects
- Focus on quality over quantity
- Build a track record with established projects
- Find projects that align with your interests and skills
