package matching

import (
	"math"
	"math/rand"
	"sort"
)

// JaccardSimilarity computes the Jaccard index between two string slices
func JaccardSimilarity(a, b []string) float64 {
	if len(a) == 0 && len(b) == 0 {
		return 1.0
	}

	setA := make(map[string]struct{}, len(a))
	for _, s := range a {
		setA[s] = struct{}{}
	}

	intersection := 0
	union := make(map[string]struct{})
	for _, s := range a {
		union[s] = struct{}{}
	}
	for _, s := range b {
		union[s] = struct{}{}
		if _, ok := setA[s]; ok {
			intersection++
		}
	}

	return float64(intersection) / float64(len(union))
}

// NormalizedBalance applies tanh to squash the balance into [-1, 1]
func NormalizedBalance(balance int, stddev float64) float64 {
	if stddev <= 0 {
		return math.Tanh(float64(balance) / 100.0)
	}
	return math.Tanh(float64(balance) / stddev)
}

// DiversityPenalty computes the penalty for recently shown candidates
func DiversityPenalty(recentShownCount int, windowSize int) float64 {
	if windowSize <= 0 {
		windowSize = 10
	}
	ratio := float64(recentShownCount) / float64(windowSize)
	if ratio > 1.0 {
		ratio = 1.0
	}
	return ratio
}

// SizeMismatchPenalty penalizes pairing sites with very different traffic levels
func SizeMismatchPenalty(rankA, rankB, networkSize int) float64 {
	if networkSize <= 1 {
		return 0
	}
	diff := math.Abs(float64(rankA - rankB))
	return math.Min(1.0, diff/float64(networkSize))
}

// ScoreCandidate computes the matching score for a candidate vs a requester
func ScoreCandidate(candidate, requester Startup, w Weights, ctx MatchContext) float64 {
	catSim := JaccardSimilarity(candidate.Categories, requester.Categories)
	normBalance := NormalizedBalance(candidate.Balance, ctx.NetworkStdDev)
	diversity := DiversityPenalty(candidate.RecentShown, 10)
	sizeMismatch := SizeMismatchPenalty(candidate.TrafficRank, requester.TrafficRank, ctx.NetworkSize)

	return w.CatSim*catSim +
		w.Balance*normBalance +
		w.Trust*candidate.TrustScore -
		w.Diversity*diversity -
		w.SizeMismatch*sizeMismatch +
		w.BoostBonus*float64(candidate.BoostLevel)
}

// ScoredCandidate is a candidate with its computed score
type ScoredCandidate struct {
	Startup Startup
	Score   float64
}

// SelectTopKWeighted returns a weighted random selection from the top K candidates
func SelectTopKWeighted(candidates []Startup, requester Startup, w Weights, ctx MatchContext, k int) (Startup, error) {
	if len(candidates) == 0 {
		return Startup{}, ErrNoCandidates
	}

	scored := make([]ScoredCandidate, len(candidates))
	for i, c := range candidates {
		scored[i] = ScoredCandidate{
			Startup: c,
			Score:   ScoreCandidate(c, requester, w, ctx),
		}
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].Score > scored[j].Score
	})

	if k > len(scored) {
		k = len(scored)
	}
	top := scored[:k]

	weights := make([]float64, k)
	for i := range top {
		weights[i] = 0.4 * math.Pow(0.5, float64(i))
	}

	total := 0.0
	for _, w := range weights {
		total += w
	}
	for i := range weights {
		weights[i] /= total
	}

	r := rand.Float64()
	cumulative := 0.0
	for i, sc := range top {
		cumulative += weights[i]
		if r <= cumulative {
			return sc.Startup, nil
		}
	}

	return top[0].Startup, nil
}
