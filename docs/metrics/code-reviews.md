# Code Reviews

**What it measures:** The number of code reviews you've given to other contributors' pull requests.

**Why it matters:** Participating in code reviews demonstrates community engagement beyond just submitting your own
code. It shows you understand the project well enough to help review others' work.

## How It's Calculated

```text
Code Reviews = Total reviews given to other contributors' PRs
```

**Data Sources:**

- GitHub GraphQL API: Contribution activity data
- Counts reviews where user is the reviewer (not the PR author)

**Additional Data Tracked:**

- Review comments count
- Repositories where reviews were given

## Configuration

| Input                    | Default | Description                   |
| ------------------------ | ------- | ----------------------------- |
| `threshold-code-reviews` | `0`     | Minimum code reviews required |

## Edge Cases

- Self-reviews (reviewing your own PR) are not counted
- Draft PR reviews are included
- Only reviews within the analysis window are counted
- Pending/dismissed reviews may still be counted

## How to Improve

- Look for PRs tagged with "good first review" or "help wanted"
- Start with reviewing documentation or test changes
- Provide constructive, actionable feedback
- Focus on code quality, not just style preferences
