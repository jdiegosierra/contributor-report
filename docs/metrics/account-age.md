# Account Age

**What it measures:** The age of the GitHub account in days.

**Why it matters:** Very new accounts are sometimes used for spam or low-quality contributions. Established accounts
have a track record and are generally more trustworthy.

## How It's Calculated

```text
Account Age (days) = Current Date - Account Creation Date
```

**Data Sources:**

- GitHub GraphQL API: `user.createdAt`

**Note:** This is a simple calculation based on when the GitHub account was created, not when the user started
contributing to open source.

## Configuration

| Input                        | Default   | Description                                                   |
| ---------------------------- | --------- | ------------------------------------------------------------- |
| `threshold-account-age`      | `0`       | Minimum account age in days                                   |
| `new-account-threshold-days` | `30`      | Days to consider account "new"                                |
| `new-account-action`         | `neutral` | Action for new accounts: `neutral`, `require-review`, `block` |

## Edge Cases

- Account creation date is always available from GitHub API
- Bot accounts (e.g., `dependabot[bot]`) are typically whitelisted separately
- Account age doesn't reflect actual contribution history

## Special Handling for New Accounts

New accounts (below `new-account-threshold-days`) can be handled specially:

- `neutral`: No special treatment, evaluate normally
- `require-review`: Add a label for manual review
- `block`: Fail the check automatically

## How to Improve

- Continue using your GitHub account over time
- Build a consistent contribution history
- New contributors should be patient - account age increases naturally
