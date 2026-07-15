# spec-002-v1: Matching & Reciprocity Scoring Prototype

**Status:** DRAFT
**Version:** 1
**Depends On:** NONE
**Blocks:** spec-005, spec-006
**Task Reference:** T-002

## What

Prototype the matching engine's scoring function and the reciprocity ledger logic in Go against a small synthetic dataset. Validate that the weighting model (category similarity, balance, trust, diversity penalty, size mismatch penalty) produces sensible match rankings before real users are involved.

## Acceptance Criteria

- Given a synthetic dataset of 50 startups across 5 categories with varying balances and trust scores, when `scoreCandidate(P, R)` is computed for all valid pairs, then category-similar startups score higher than cross-category ones when `w1=0.35`
- Given a startup with positive balance (giving more than receiving) and one with negative balance, when both are scored against the same requester, then the positive-balance startup receives a higher score
- Given a startup has been shown 8 times recently, when diversity penalty is computed, then its score is reduced proportionally (≥0.05 reduction vs a startup shown 0 times)
- Given a high-traffic startup and a low-traffic startup, when size-mismatch penalty is applied, then the score difference between them is reduced compared to not applying the penalty
- Given the top-3 selection algorithm, when run 1000 times against the same candidate pool, then the highest-scored candidate is selected ≥25% of the time and the lowest-scored candidate among the top-3 is selected ≤20% of the time (verifying weighted-random distribution)
- Given a monthly ledger computation, when carryover logic is applied (20% of previous balance carries forward), then a startup with balance 100 in period 1 starts period 2 with carryover = 20 (balance * 0.2)
- Given a startup with no prior period, when the ledger is computed for the first time, then carryover_from_prev = 0

## Risks

Synthetic data may not reflect real-world category distribution or traffic patterns. Weights are unlikely to be optimal at launch — this spec validates the mechanics, not the accuracy.

## Rollback

Delete the prototype binary/test output. No persistent state.
