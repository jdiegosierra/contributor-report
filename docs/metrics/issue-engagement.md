# Issue Engagement

**What it measures:** The number of issues you've created that received community engagement (comments or reactions).

**Why it matters:** Creating issues that spark discussion shows you can identify real problems and communicate them
effectively. Issues without engagement may indicate spam or low-quality reports.

## How It's Calculated

```text
Issue Engagement = Number of issues with (comments > 0 OR reactions > 0)
```

**Engagement Definition:**

- An issue has engagement if it has at least one comment from another user OR at least one reaction
- Comments from the issue author are not counted as engagement

**Data Sources:**

- GitHub GraphQL API: `search(type: ISSUE)` for issues created by user
- Comment and reaction counts per issue

**Additional Data Tracked:**

- Total issues created
- Issues with comments from others
- Issues with reactions
- Average comments per issue

## Configuration

| Input                        | Default | Description                     |
| ---------------------------- | ------- | ------------------------------- |
| `threshold-issue-engagement` | `0`     | Minimum engaged issues required |

## Edge Cases

- Closed issues are included
- Issues on user's own repositories are included
- Bot comments may count as engagement
- Deleted comments/reactions are not counted

## How to Improve

- Provide clear reproduction steps in bug reports
- Include relevant code samples and error messages
- Research existing issues before creating new ones
- Follow up on questions and discussions
