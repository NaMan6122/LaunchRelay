package matching

// Startup represents a startup in the network
type Startup struct {
	ID           string
	Name         string
	Categories   []string
	Balance      int
	TrustScore   float64
	TrafficRank  int // 1 = highest traffic
	RecentShown  int // times shown to a specific requester in last 7 days
	Pitch        string
	URL          string
	LogoURL      string
	BoostLevel   int
}

// Weights for the scoring function
type Weights struct {
	CatSim       float64
	Balance      float64
	Trust        float64
	Diversity    float64
	SizeMismatch float64
	BoostBonus   float64
}

// DefaultWeights returns the default weight configuration
func DefaultWeights() Weights {
	return Weights{
		CatSim:       0.35,
		Balance:      0.20,
		Trust:        0.20,
		Diversity:    0.15,
		SizeMismatch: 0.10,
		BoostBonus:   0.10,
	}
}

// ColdStartWeights returns weights for the cold-start phase (<500 members)
func ColdStartWeights() Weights {
	return Weights{
		CatSim:       0.25,
		Balance:      0.10,
		Trust:        0.15,
		Diversity:    0.10,
		SizeMismatch: 0.05,
		BoostBonus:   0.10,
	}
}

// MatchContext provides context for scoring
type MatchContext struct {
	Requester      Startup
	NetworkSize    int
	RecentMatches  map[string]int // candidateID → count shown recently
	NetworkStdDev  float64        // std dev of balances across the network
}
