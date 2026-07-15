package ledger

// Entry represents a single monthly ledger entry for a startup
type Entry struct {
	StartupID         string
	PeriodStart       string // YYYY-MM-DD
	PeriodEnd         string // YYYY-MM-DD
	ImpressionsGiven  int
	ImpressionsReceived int
	Balance           int
	CarryoverFromPrev int
	EffectiveBalance  int
}

// PreviousEntry represents the prior period's closing state
type PreviousEntry struct {
	Balance           int
	CarryoverFromPrev int
}

const carryoverRate = 0.20

// ComputeEntry computes a new ledger entry given the current period and previous period data
func ComputeEntry(
	startupID string,
	periodStart, periodEnd string,
	impressionsGiven, impressionsReceived int,
	prev PreviousEntry,
) Entry {
	balance := impressionsGiven - impressionsReceived
	carryover := int(float64(prev.Balance)*carryoverRate) + prev.CarryoverFromPrev
	effectiveBalance := balance + carryover

	return Entry{
		StartupID:          startupID,
		PeriodStart:        periodStart,
		PeriodEnd:          periodEnd,
		ImpressionsGiven:   impressionsGiven,
		ImpressionsReceived: impressionsReceived,
		Balance:            balance,
		CarryoverFromPrev:  carryover,
		EffectiveBalance:   effectiveBalance,
	}
}

// FirstEntry computes the very first ledger entry (no prior period)
func FirstEntry(
	startupID string,
	periodStart, periodEnd string,
	impressionsGiven, impressionsReceived int,
) Entry {
	return ComputeEntry(startupID, periodStart, periodEnd,
		impressionsGiven, impressionsReceived, PreviousEntry{})
}
