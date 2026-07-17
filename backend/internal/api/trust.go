package api

import (
	"math"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type TrustScoreResponse struct {
	StartupID    string  `json:"startup_id"`
	TrustScore   float64 `json:"trust_score"`
	Breakdown    TrustBreakdown `json:"breakdown"`
}

type TrustBreakdown struct {
	Baseline         float64 `json:"baseline"`
	DomainAgeBonus   float64 `json:"domain_age_bonus"`
	CrawlPassRate    float64 `json:"crawl_pass_rate"`
	PassRateAdjust   float64 `json:"pass_rate_adjustment"`
	ActiveFlags      int     `json:"active_flags"`
	TrafficVerified  bool    `json:"traffic_verified"`
	TrafficBonus     float64 `json:"traffic_bonus"`
}

func (s *Server) handleTrustScore() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		startupID := chi.URLParam(r, "id")

		var exists bool
		s.db.Get(&exists, `SELECT EXISTS(SELECT 1 FROM startups WHERE id = $1)`, startupID)
		if !exists {
			writeError(w, http.StatusNotFound, "startup not found")
			return
		}

		score, breakdown := computeTrustScore(s, startupID)

		writeOK(w, TrustScoreResponse{
			StartupID:  startupID,
			TrustScore: score,
			Breakdown:  breakdown,
		})
	}
}

func computeTrustScore(s *Server, startupID string) (float64, TrustBreakdown) {
	b := TrustBreakdown{
		Baseline: 0.5,
	}

	// Domain age bonus
	var createdAt time.Time
	s.db.Get(&createdAt, `SELECT created_at FROM startups WHERE id = $1`, startupID)
	ageInDays := time.Since(createdAt).Hours() / 24
	b.DomainAgeBonus = math.Min(0.1, ageInDays/365*0.1)

	// Re-crawl pass rate (last 30 days)
	var passCount, totalCrawls int
	s.db.Get(&passCount, `
		SELECT COUNT(*) FROM trust_signals
		WHERE startup_id = $1 AND signal_type = 're_crawl_pass'
		AND timestamp >= NOW() - INTERVAL '30 days'
	`, startupID)
	s.db.Get(&totalCrawls, `
		SELECT COUNT(*) FROM trust_signals
		WHERE startup_id = $1 AND signal_type LIKE 're_crawl_%'
		AND timestamp >= NOW() - INTERVAL '30 days'
	`, startupID)

	if totalCrawls > 0 {
		b.CrawlPassRate = float64(passCount) / float64(totalCrawls)
		b.PassRateAdjust = (b.CrawlPassRate - 0.8) * 0.3
	}

	// Traffic verification bonus
	s.db.Get(&b.TrafficVerified, `
		SELECT verified_traffic_tier FROM startups WHERE id = $1
	`, startupID)
	if b.TrafficVerified {
		b.TrafficBonus = 0.15
	}

	// Active manual review flags
	s.db.Get(&b.ActiveFlags, `
		SELECT COUNT(*) FROM trust_signals
		WHERE startup_id = $1 AND signal_type = 'manual_review_flag'
		AND timestamp >= NOW() - INTERVAL '30 days'
	`, startupID)

	score := b.Baseline + b.DomainAgeBonus + b.PassRateAdjust + b.TrafficBonus - float64(b.ActiveFlags)*0.1
	score = math.Max(0, math.Min(1, score))

	return score, b
}
