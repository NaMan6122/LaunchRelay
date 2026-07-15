package db

import (
	"testing"
)

func TestAllTablesExist(t *testing.T) {
	cfg := ConfigFromEnv()
	db, err := Connect(cfg)
	if err != nil {
		t.Skipf("database not available: %v", err)
	}
	defer db.Close()

	expected := []string{
		"startups",
		"categories",
		"startup_categories",
		"category_adjacencies",
		"embed_instances",
		"impressions",
		"clicks",
		"reciprocity_ledger",
		"trust_signals",
		"daily_metrics",
		"match_cache",
		"competitor_exclusions",
	}

	for _, table := range expected {
		var exists bool
		err := db.QueryRow(
			`SELECT EXISTS (
				SELECT FROM information_schema.tables
				WHERE table_name = $1
			)`, table,
		).Scan(&exists)
		if err != nil {
			t.Errorf("checking table %s: %v", table, err)
			continue
		}
		if !exists {
			t.Errorf("table %s does not exist", table)
		}
	}
}
