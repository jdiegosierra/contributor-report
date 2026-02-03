# Suspicious Patterns

**What it measures:** Detection of activity patterns commonly associated with spam accounts or AI-generated
contributions.

**Why it matters:** Certain combinations of behaviors are strong indicators of automated spam or AI slop. This metric
performs cross-analysis of multiple data points to identify suspicious patterns.

## Patterns Detected

### SPAM_PATTERN (Critical)

**Trigger:** New account with high PR volume across many repositories

**Criteria:**

- Account age < 30 days
- Total PRs > 25
- Unique repositories > 10

**Why it's suspicious:** Spam accounts often create many PRs across numerous repositories shortly after being created.

### HIGH_PR_RATE (Warning)

**Trigger:** Unusually high rate of PR submissions

**Criteria:**

- PR rate > 2.0 PRs per day average

**Why it's suspicious:** Legitimate contributors rarely submit more than 2 PRs per day consistently. Higher rates
suggest automation.

### SELF_MERGE_ABUSE (Critical)

**Trigger:** High self-merge rate on low-quality repositories

**Criteria:**

- Self-merge rate > 80%
- Many low-quality (low-star) PRs
- Contributions mainly to own repositories

**Why it's suspicious:** Creating and self-merging many PRs on personal low-star repos is a common tactic to
artificially inflate contribution metrics.

### REPO_SPAM (Warning)

**Trigger:** Contributions spread across many low-quality repositories

**Criteria:**

- Unique repository count > 15
- Average stars < 10

**Why it's suspicious:** Legitimate contributors typically focus on fewer, higher-quality projects rather than spreading
across many obscure repositories.

## Configuration

| Input                   | Default | Description                         |
| ----------------------- | ------- | ----------------------------------- |
| `enable-spam-detection` | `true`  | Enable suspicious pattern detection |

**Note:** This metric cannot be configured with custom thresholds. Critical patterns always cause automatic failure when
spam detection is enabled.

## Severity Levels

- **CRITICAL:** Automatic failure, high confidence of spam/abuse
- **WARNING:** Flagged for review, possible false positive

## Evidence

When patterns are detected, the system provides evidence including:

- Specific values that triggered the pattern
- Thresholds that were exceeded
- Contributing factors

## How to Avoid False Positives

- Contribute consistently over time rather than in bursts
- Focus on quality contributions to established projects
- Build genuine community engagement through reviews and discussions
- Avoid mass-creating PRs across many repositories
