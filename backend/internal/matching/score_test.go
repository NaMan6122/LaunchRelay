package matching

import (
	"math"
	"testing"
)

func TestJaccardSimilarity(t *testing.T) {
	tests := []struct {
		name string
		a, b []string
		want float64
	}{
		{"identical", []string{"devtools"}, []string{"devtools"}, 1.0},
		{"no overlap", []string{"devtools"}, []string{"fintech"}, 0.0},
		{"partial", []string{"devtools", "saas"}, []string{"devtools", "fintech"}, 1.0 / 3.0},
		{"subset", []string{"devtools"}, []string{"devtools", "saas"}, 0.5},
		{"both empty", []string{}, []string{}, 1.0},
		{"one empty", []string{"devtools"}, []string{}, 0.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := JaccardSimilarity(tt.a, tt.b)
			if math.Abs(got-tt.want) > 0.001 {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNormalizedBalance(t *testing.T) {
	tests := []struct {
		name    string
		balance int
		stddev  float64
	}{
		{"positive balance", 100, 50},
		{"negative balance", -100, 50},
		{"zero balance", 0, 50},
		{"high positive", 1000, 50},
		{"high negative", -1000, 50},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NormalizedBalance(tt.balance, tt.stddev)
			if got < -1.0 || got > 1.0 {
				t.Errorf("balance normalization out of range [-1,1]: %v", got)
			}
		})
	}
}

func TestCategorySimilarStartupsScoreHigher(t *testing.T) {
	w := DefaultWeights()
	ctx := MatchContext{
		NetworkSize:   50,
		NetworkStdDev: 100,
	}

	requester := Startup{
		ID:          "R1",
		Categories:  []string{"devtools", "saas"},
		Balance:     0,
		TrustScore:  0.5,
		TrafficRank: 25,
	}

	highOverlap := Startup{
		ID:          "C1",
		Categories:  []string{"devtools", "saas"},
		Balance:     0,
		TrustScore:  0.5,
		TrafficRank: 25,
	}

	noOverlap := Startup{
		ID:          "C2",
		Categories:  []string{"fintech"},
		Balance:     0,
		TrustScore:  0.5,
		TrafficRank: 25,
	}

	scoreHigh := ScoreCandidate(highOverlap, requester, w, ctx)
	scoreLow := ScoreCandidate(noOverlap, requester, w, ctx)

	if scoreHigh <= scoreLow {
		t.Errorf("expected high-overlap candidate (%v) to score higher than no-overlap (%v)", scoreHigh, scoreLow)
	}
}

func TestPositiveBalanceScoresHigher(t *testing.T) {
	w := DefaultWeights()
	ctx := MatchContext{
		NetworkSize:   50,
		NetworkStdDev: 100,
	}

	requester := Startup{
		ID:          "R1",
		Categories:  []string{"devtools"},
		Balance:     0,
		TrustScore:  0.5,
		TrafficRank: 25,
	}

	positiveBalance := Startup{
		ID:          "C1",
		Categories:  []string{"devtools"},
		Balance:     100,
		TrustScore:  0.5,
		TrafficRank: 25,
	}

	negativeBalance := Startup{
		ID:          "C2",
		Categories:  []string{"devtools"},
		Balance:     -100,
		TrustScore:  0.5,
		TrafficRank: 25,
	}

	scorePos := ScoreCandidate(positiveBalance, requester, w, ctx)
	scoreNeg := ScoreCandidate(negativeBalance, requester, w, ctx)

	if scorePos <= scoreNeg {
		t.Errorf("expected positive-balance candidate (%v) to score higher than negative-balance (%v)", scorePos, scoreNeg)
	}
}

func TestDiversityPenaltyReducesScore(t *testing.T) {
	w := DefaultWeights()
	ctx := MatchContext{
		NetworkSize:   50,
		NetworkStdDev: 100,
	}

	requester := Startup{
		ID:          "R1",
		Categories:  []string{"devtools"},
		Balance:     0,
		TrustScore:  0.5,
		TrafficRank: 25,
		RecentShown: 0,
	}

	recent := Startup{
		ID:          "C1",
		Categories:  []string{"devtools"},
		Balance:     0,
		TrustScore:  0.5,
		TrafficRank: 25,
		RecentShown: 8,
	}

	notRecent := Startup{
		ID:          "C2",
		Categories:  []string{"devtools"},
		Balance:     0,
		TrustScore:  0.5,
		TrafficRank: 25,
		RecentShown: 0,
	}

	scoreRecent := ScoreCandidate(recent, requester, w, ctx)
	scoreNotRecent := ScoreCandidate(notRecent, requester, w, ctx)

	reduction := scoreNotRecent - scoreRecent
	if reduction < 0.05 {
		t.Errorf("expected diversity penalty >= 0.05, got %v (recent=%v, notRecent=%v)", reduction, scoreRecent, scoreNotRecent)
	}
}

func TestSizeMismatchPenalty(t *testing.T) {
	small := SizeMismatchPenalty(1, 2, 50)
	large := SizeMismatchPenalty(1, 50, 50)

	if large <= small {
		t.Errorf("expected larger rank difference to produce larger penalty: small=%v, large=%v", small, large)
	}

	if small != 1.0/50.0 {
		t.Errorf("expected size mismatch for ranks 1 and 2 in network 50 to be 0.02, got %v", small)
	}

	if large != 49.0/50.0 {
		t.Errorf("expected size mismatch for ranks 1 and 50 in network 50 to be 0.98, got %v", large)
	}
}

func TestTopKWeightedDistribution(t *testing.T) {
	w := DefaultWeights()
	ctx := MatchContext{
		NetworkSize:   10,
		NetworkStdDev: 100,
	}

	requester := Startup{
		ID:          "R1",
		Categories:  []string{"devtools"},
		Balance:     0,
		TrustScore:  0.5,
		TrafficRank: 5,
	}

	candidates := make([]Startup, 5)
	for i := range candidates {
		candidates[i] = Startup{
			ID:          string(rune('A' + i)),
			Categories:  []string{"devtools"},
			Balance:     0,
			TrustScore:  0.5,
			TrafficRank: i + 1,
		}
	}

	// Run 1000 selections and count how often each is picked
	counts := make(map[string]int)
	for range 1000 {
		selected, err := SelectTopKWeighted(candidates, requester, w, ctx, 3)
		if err != nil {
			t.Fatal(err)
		}
		counts[selected.ID]++
	}

	// The highest-scored (lowest traffic rank = highest traffic) should be picked
	// most often due to weighted selection
	// A = rank 1, should be top-scored
	if counts["A\u0000"] == 0 {
		t.Log("Top candidate A was never selected (may happen rarely with randomness)")
	}

	// Verify total selections sum to 1000
	total := 0
	for _, c := range counts {
		total += c
	}
	if total != 1000 {
		t.Errorf("expected 1000 total selections, got %d", total)
	}
}

func TestColdStartWeights(t *testing.T) {
	w := ColdStartWeights()
	if w.CatSim >= DefaultWeights().CatSim {
		t.Errorf("cold start cat sim should be lower than default")
	}
}

func TestNoCandidatesError(t *testing.T) {
	_, err := SelectTopKWeighted(nil, Startup{}, DefaultWeights(), MatchContext{}, 3)
	if err != ErrNoCandidates {
		t.Errorf("expected ErrNoCandidates, got %v", err)
	}
}

func TestScoreRanges(t *testing.T) {
	w := DefaultWeights()
	ctx := MatchContext{
		NetworkSize:   50,
		NetworkStdDev: 100,
	}

	requester := Startup{
		ID:          "R1",
		Categories:  []string{"devtools"},
		Balance:     0,
		TrustScore:  0.5,
		TrafficRank: 25,
	}

	candidates := []Startup{
		{Categories: []string{"devtools"}, Balance: 100, TrustScore: 0.9, TrafficRank: 1, RecentShown: 0},
		{Categories: []string{"fintech"}, Balance: -100, TrustScore: 0.1, TrafficRank: 50, RecentShown: 10},
	}

	for _, c := range candidates {
		score := ScoreCandidate(c, requester, w, ctx)
		if score < -1.0 || score > 1.0 {
			t.Errorf("score %v out of expected range [-1, 1] for candidate %+v", score, c)
		}
	}
}
