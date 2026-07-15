package api

import (
	"net/http"
	"time"

	"github.com/launchrelay/backend/internal/ledger"
)

func (s *Server) handleComputeLedger() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		now := time.Now().UTC()
		periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		periodEnd := periodStart.AddDate(0, 1, -1)

		rows, err := s.db.Query(`
			SELECT id FROM startups WHERE status = 'active'
		`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to query startups")
			return
		}
		defer rows.Close()

		type prevEntry struct {
			Balance           int
			CarryoverFromPrev int
		}

		count := 0
		for rows.Next() {
			var startupID string
			rows.Scan(&startupID)

			var impressionsGiven, impressionsReceived int
			s.db.QueryRow(`
				SELECT
					COALESCE(SUM(CASE WHEN viewer_startup_id = $1 THEN 1 ELSE 0 END), 0),
					COALESCE(SUM(CASE WHEN shown_startup_id = $1 THEN 1 ELSE 0 END), 0)
				FROM impressions
				WHERE verified = true
				AND timestamp >= $2 AND timestamp < $2 + INTERVAL '1 month'
			`, startupID, periodStart).Scan(&impressionsGiven, &impressionsReceived)

			var prev prevEntry
			err := s.db.Get(&prev, `
				SELECT balance, carryover_from_prev
				FROM reciprocity_ledger
				WHERE startup_id = $1
				ORDER BY period_start DESC LIMIT 1
			`, startupID)
			if err != nil {
				prev = prevEntry{}
			}

			le := ledger.ComputeEntry(
				startupID,
				periodStart.Format("2006-01-02"),
				periodEnd.Format("2006-01-02"),
				impressionsGiven,
				impressionsReceived,
				ledger.PreviousEntry{
					Balance:           prev.Balance,
					CarryoverFromPrev: prev.CarryoverFromPrev,
				},
			)

			_, err = s.db.Exec(`
				INSERT INTO reciprocity_ledger
					(startup_id, period_start, period_end, impressions_given, impressions_received,
					 balance, carryover_from_prev)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
			`, le.StartupID, le.PeriodStart, le.PeriodEnd,
				le.ImpressionsGiven, le.ImpressionsReceived,
				le.Balance, le.CarryoverFromPrev)
			if err == nil {
				count++
			}
		}

		writeOK(w, map[string]interface{}{
			"period_start": periodStart.Format("2006-01-02"),
			"period_end":   periodEnd.Format("2006-01-02"),
			"startups_computed": count,
		})
	}
}
