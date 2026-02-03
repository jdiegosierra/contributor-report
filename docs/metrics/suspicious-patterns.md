# Suspicious Patterns

**What it measures:** Detection of activity patterns commonly associated with spam accounts.

**Why it matters:** Certain combinations of behaviors (new account + high PR volume + many repos) are strong indicators
of automated spam.

## Patterns Detected

- **SPAM_PATTERN:** New account (<30 days) with >25 PRs across >10 repositories
- **HIGH_PR_RATE:** More than 2 PRs per day on average
- **SELF_MERGE_ABUSE:** High rate of self-merges on low-quality repositories
- **REPO_SPAM:** Contributions to many repos with very low star counts

**Note:** This metric cannot be configured with a threshold. Critical patterns cause automatic failure.
