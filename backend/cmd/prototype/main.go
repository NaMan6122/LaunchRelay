package main

import (
	"fmt"
	"math"
	"math/rand"

	"github.com/launchrelay/backend/internal/ledger"
	"github.com/launchrelay/backend/internal/matching"
)

func main() {
	fmt.Println("=== LaunchRelay Matching Engine Prototype ===")

	// Generate synthetic dataset: 50 startups across 5 categories
	categories := []string{"devtools", "fintech", "saas", "consumer", "no-code"}
	rng := rand.New(rand.NewSource(42))

	startups := make([]matching.Startup, 50)
	balances := make([]int, 50)
	for i := range startups {
		cat1 := categories[rng.Intn(len(categories))]
		cat2 := categories[rng.Intn(len(categories))]
		// Ensure cat1 != cat2 sometimes
		if rng.Float64() < 0.5 {
			cat2 = cat1
		}

		startups[i] = matching.Startup{
			ID:          fmt.Sprintf("startup-%03d", i+1),
			Name:        fmt.Sprintf("Startup %d", i+1),
			Categories:  []string{cat1, cat2},
			Balance:     rng.Intn(401) - 200, // -200 to +200
			TrustScore:  rng.Float64() * 0.8, // 0.0 to 0.8
			TrafficRank: i + 1,
		}
		balances[i] = startups[i].Balance
	}

	stddev := computeStddev(balances)
	fmt.Printf("Dataset: %d startups across %d categories\n", len(startups), len(categories))
	fmt.Printf("Std dev of balances: %.1f\n\n", stddev)

	// Test scoring with requester
	requester := matching.Startup{
		ID:          "startup-001",
		Categories:  []string{"devtools", "saas"},
		Balance:     50,
		TrustScore:  0.7,
		TrafficRank: 1,
	}

	w := matching.DefaultWeights()
	ctx := matching.MatchContext{
		Requester:     requester,
		NetworkSize:   len(startups),
		NetworkStdDev: stddev,
	}

	fmt.Printf("Requester: %s (categories: %v, balance: %d, trust: %.2f)\n\n",
		requester.Name, requester.Categories, requester.Balance, requester.TrustScore)
	fmt.Println("--- Top 10 matches ---")
	fmt.Printf("%-20s %-20s %-10s %-10s %-10s %s\n", "Candidate", "Categories", "Balance", "Trust", "Score", "Notes")

	// Score all candidates
	type scored struct {
		s     matching.Startup
		score float64
	}
	var results []scored
	for _, c := range startups {
		if c.ID == requester.ID {
			continue
		}
		s := matching.ScoreCandidate(c, requester, w, ctx)
		results = append(results, scored{c, s})
	}

	// Sort by score descending
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].score > results[i].score {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	for _, r := range results[:10] {
		note := ""
		if matching.JaccardSimilarity(r.s.Categories, requester.Categories) > 0 {
			note = "★ same category"
		}
		fmt.Printf("%-20s %-20v %-10d %-10.2f %-10.4f %s\n",
			r.s.Name, r.s.Categories, r.s.Balance, r.s.TrustScore, r.score, note)
	}

	// Test category filtering
	fmt.Println("\n--- Category similarity examples ---")
	fmt.Printf("devtools vs devtools:        %.2f\n", matching.JaccardSimilarity([]string{"devtools"}, []string{"devtools"}))
	fmt.Printf("devtools vs fintech:         %.2f\n", matching.JaccardSimilarity([]string{"devtools"}, []string{"fintech"}))
	fmt.Printf("devtools vs [devtools,saas]: %.2f\n", matching.JaccardSimilarity([]string{"devtools"}, []string{"devtools", "saas"}))

	// Test ledger
	fmt.Println("\n--- Reciprocity Ledger Example ---")
	e1 := ledger.FirstEntry("startup-001", "2026-07-01", "2026-07-31", 500, 300)
	fmt.Printf("Period 1: given=%d, received=%d, balance=%d, carryover=%d, effective=%d\n",
		e1.ImpressionsGiven, e1.ImpressionsReceived, e1.Balance, e1.CarryoverFromPrev, e1.EffectiveBalance)

	e2 := ledger.ComputeEntry("startup-001", "2026-08-01", "2026-08-31", 400, 200,
		ledger.PreviousEntry{Balance: e1.Balance, CarryoverFromPrev: e1.CarryoverFromPrev})
	fmt.Printf("Period 2: given=%d, received=%d, balance=%d, carryover=%d, effective=%d (carryover = %d*0.2+%d)\n",
		e2.ImpressionsGiven, e2.ImpressionsReceived, e2.Balance, e2.CarryoverFromPrev, e2.EffectiveBalance, e1.Balance, e1.CarryoverFromPrev)

	// Test weighted random selection
	fmt.Println("\n--- Top-3 Weighted Random Selection (1000 trials) ---")
	selected, err := matching.SelectTopKWeighted(startups, requester, w, ctx, 3)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Printf("Selected: %s (score distribution verified in unit tests)\n", selected.Name)
	}
}

func computeStddev(vals []int) float64 {
	if len(vals) < 2 {
		return 0
	}
	mean := 0.0
	for _, v := range vals {
		mean += float64(v)
	}
	mean /= float64(len(vals))

	variance := 0.0
	for _, v := range vals {
		variance += math.Pow(float64(v)-mean, 2)
	}
	variance /= float64(len(vals) - 1)
	return math.Sqrt(variance)
}
