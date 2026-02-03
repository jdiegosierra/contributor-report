# Positive Reactions

**What it measures:** The total number of positive reactions received on your comments and issues.

**Why it matters:** Positive community engagement indicates that your contributions are helpful and well-received. This
metric reflects how you interact with others in the community.

## How It's Calculated

```text
Positive Reactions = THUMBS_UP + HEART + ROCKET + HOORAY
```

**Reaction Types Classified as Positive:**

- `THUMBS_UP` (👍)
- `HEART` (❤️)
- `ROCKET` (🚀)
- `HOORAY` (🎉)

**Data Sources:**

- GitHub GraphQL API: `user.issueComments.nodes[].reactions`
- GitHub GraphQL API: `user.issues.nodes[].reactions`

**Additional Data Tracked:**

- Total comments analyzed
- Negative reactions count
- Neutral reactions count (LAUGH, EYES)
- Positive ratio (positive / total)

## Configuration

| Input                          | Default | Description                         |
| ------------------------------ | ------- | ----------------------------------- |
| `threshold-positive-reactions` | `0`     | Minimum positive reactions required |

## Edge Cases

- Reactions on deleted comments/issues are not counted
- Self-reactions are included (GitHub API doesn't distinguish)
- Only reactions from the analysis window are counted

## How to Improve

- Provide helpful, constructive feedback in code reviews
- Write clear, detailed issue reports
- Share useful insights in discussions
- Be respectful and supportive of other contributors
