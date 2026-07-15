package ledger

import (
	"testing"
)

func TestFirstEntryHasNoCarryover(t *testing.T) {
	e := FirstEntry("startup-1", "2026-07-01", "2026-07-31", 100, 60)
	if e.CarryoverFromPrev != 0 {
		t.Errorf("expected carryover 0, got %d", e.CarryoverFromPrev)
	}
	if e.Balance != 40 {
		t.Errorf("expected balance 40, got %d", e.Balance)
	}
	if e.EffectiveBalance != 40 {
		t.Errorf("expected effective balance 40, got %d", e.EffectiveBalance)
	}
}

func TestCarryoverAppliedFromPreviousPeriod(t *testing.T) {
	e := ComputeEntry("startup-1", "2026-08-01", "2026-08-31", 50, 30,
		PreviousEntry{Balance: 40, CarryoverFromPrev: 0})

	// carryover = 40 * 0.2 + 0 = 8
	if e.CarryoverFromPrev != 8 {
		t.Errorf("expected carryover 8, got %d", e.CarryoverFromPrev)
	}
	// balance = 50 - 30 = 20
	if e.Balance != 20 {
		t.Errorf("expected balance 20, got %d", e.Balance)
	}
	// effective = 20 + 8 = 28
	if e.EffectiveBalance != 28 {
		t.Errorf("expected effective balance 28, got %d", e.EffectiveBalance)
	}
}

func TestCarryoverAccumulatesAcrossPeriods(t *testing.T) {
	// Period 1: given=100, received=50 → balance=50, carryover=0, effective=50
	p1 := FirstEntry("startup-1", "2026-07-01", "2026-07-31", 100, 50)

	// Period 2: given=80, received=60 → balance=20
	// carryover = 50*0.2 + 0 = 10, effective = 20+10 = 30
	p2 := ComputeEntry("startup-1", "2026-08-01", "2026-08-31", 80, 60,
		PreviousEntry{Balance: p1.Balance, CarryoverFromPrev: p1.CarryoverFromPrev})

	if p2.CarryoverFromPrev != 10 {
		t.Errorf("expected carryover 10, got %d", p2.CarryoverFromPrev)
	}
	if p2.EffectiveBalance != 30 {
		t.Errorf("expected effective balance 30, got %d", p2.EffectiveBalance)
	}

	// Period 3: given=40, received=80 → balance=-40
	// carryover = 20*0.2 + 10 = 14, effective = -40+14 = -26
	p3 := ComputeEntry("startup-1", "2026-09-01", "2026-09-30", 40, 80,
		PreviousEntry{Balance: p2.Balance, CarryoverFromPrev: p2.CarryoverFromPrev})

	if p3.CarryoverFromPrev != 14 {
		t.Errorf("expected carryover 14, got %d", p3.CarryoverFromPrev)
	}
	if p3.EffectiveBalance != -26 {
		t.Errorf("expected effective balance -26, got %d", p3.EffectiveBalance)
	}
}

func TestNegativeBalanceCarryover(t *testing.T) {
	e := ComputeEntry("startup-1", "2026-08-01", "2026-08-31", 30, 50,
		PreviousEntry{Balance: -20, CarryoverFromPrev: 0})

	// carryover = -20*0.2 + 0 = -4
	if e.CarryoverFromPrev != -4 {
		t.Errorf("expected carryover -4, got %d", e.CarryoverFromPrev)
	}
	// balance = 30 - 50 = -20
	if e.Balance != -20 {
		t.Errorf("expected balance -20, got %d", e.Balance)
	}
	// effective = -20 + (-4) = -24
	if e.EffectiveBalance != -24 {
		t.Errorf("expected effective balance -24, got %d", e.EffectiveBalance)
	}
}

func TestZeroImpressions(t *testing.T) {
	e := FirstEntry("startup-1", "2026-07-01", "2026-07-31", 0, 0)
	if e.Balance != 0 {
		t.Errorf("expected balance 0, got %d", e.Balance)
	}
	if e.CarryoverFromPrev != 0 {
		t.Errorf("expected carryover 0, got %d", e.CarryoverFromPrev)
	}
}
