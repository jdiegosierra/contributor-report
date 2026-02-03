# Negative Reactions

**What it measures:** The total number of negative reactions received on your comments and issues.

**Why it matters:** High negative reaction counts may indicate problematic interactions, unconstructive comments, or
spam behavior. This helps identify contributors who may be disruptive to the community.

## How It's Calculated

```text
Negative Reactions = THUMBS_DOWN + CONFUSED
```

**Reaction Types Classified as Negative:**

- `THUMBS_DOWN` (👎)
- `CONFUSED` (😕)

**Data Sources:**

- GitHub GraphQL API: `user.issueComments.nodes[].reactions`
- GitHub GraphQL API: `user.issues.nodes[].reactions`

**Note:** This metric uses a maximum threshold (<=) rather than minimum (>=). A contributor passes if their negative
reactions are at or below the threshold.

## Configuration

| Input                          | Default | Description                        |
| ------------------------------ | ------- | ---------------------------------- |
| `threshold-negative-reactions` | `0`     | Maximum negative reactions allowed |

## Edge Cases

- Zero negative reactions always passes
- Reactions on deleted comments/issues are not counted
- Self-reactions are included (GitHub API doesn't distinguish)

## How to Improve

- Keep comments constructive and helpful
- Avoid inflammatory or off-topic discussions
- Focus on technical merit in code reviews
- Ask questions respectfully when you don't understand something
