# Profile Completeness

**What it measures:** How complete and established your GitHub profile is.

**Why it matters:** A complete profile indicates a real person invested in their GitHub presence. Spam accounts often
have empty profiles with no bio, company, or followers.

## How It's Calculated

The score is calculated out of 100 points:

| Component    | Max Points | Calculation                  |
| ------------ | ---------- | ---------------------------- |
| Followers    | 40         | 1 point per follower, max 40 |
| Public Repos | 20         | 1 point per repo, max 20     |
| Bio          | 20         | 20 if present, 0 if not      |
| Company      | 20         | 20 if present, 0 if not      |

```text
Profile Score = min(followers, 40) + min(public_repos, 20) + (has_bio ? 20 : 0) + (has_company ? 20 : 0)
```

**Data Sources:**

- GitHub GraphQL API: `user.followers.totalCount`
- GitHub GraphQL API: `user.repositories.totalCount`
- GitHub GraphQL API: `user.bio`
- GitHub GraphQL API: `user.company`
- GitHub GraphQL API: `user.location`
- GitHub GraphQL API: `user.websiteUrl`

**Additional Data Tracked:**

- Has location (informational)
- Has website (informational)

## Configuration

| Input                            | Default | Description                   |
| -------------------------------- | ------- | ----------------------------- |
| `threshold-profile-completeness` | `0`     | Minimum profile score (0-100) |

## Score Examples

| Profile  | Followers | Repos | Bio | Company | Score |
| -------- | --------- | ----- | --- | ------- | ----- |
| Complete | 50+       | 20+   | Yes | Yes     | 100   |
| Moderate | 10        | 5     | Yes | No      | 55    |
| Minimal  | 0         | 0     | No  | No      | 0     |

## Edge Cases

- Private repositories are not counted in public_repos
- Empty bio ("") is treated as not having a bio
- Bot accounts typically have low scores but are whitelisted

## How to Improve

- Add a descriptive bio explaining your work and interests
- Include your company or organization
- Build genuine connections to gain followers
- Create or contribute to public repositories
