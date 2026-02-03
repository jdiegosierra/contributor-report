# Activity Consistency

**What it measures:** How consistently the contributor has been active over the analysis period.

**Why it matters:** Consistent activity over time indicates genuine engagement with open source. Burst activity patterns
(e.g., many contributions in a single day) can be a sign of spam or AI-generated contributions.

## How It's Calculated

```text
Consistency Score = Months with Activity / Total Months in Analysis Window
```

**Activity Definition:**

- A month is considered "active" if the contributor created at least one PR during that month
- Only months within the analysis window are considered

**Data Sources:**

- GitHub GraphQL API: `user.pullRequests.nodes[].createdAt`
- Grouped by month to count unique active months

## Configuration

| Input                            | Default | Description                     |
| -------------------------------- | ------- | ------------------------------- |
| `threshold-activity-consistency` | `0`     | Minimum consistency score (0-1) |
| `analysis-window`                | `12`    | Months of history to analyze    |

## Example

For a 12-month analysis window:

- 12 months with activity: 100% consistency (1.0)
- 6 months with activity: 50% consistency (0.5)
- 1 month with activity: 8.3% consistency (0.083)

## Edge Cases

- New accounts with less history than the analysis window are evaluated on available months
- If account is newer than analysis window, only counts months since account creation
- Months with only closed (not merged) PRs still count as active

## How to Improve

- Contribute regularly over time rather than in bursts
- Set aside time each month for open source contributions
- Start with small, manageable contributions you can sustain
