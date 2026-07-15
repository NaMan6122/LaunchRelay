package api

import (
	"net/http"
	"sync"
	"time"
)

type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	// Prune old entries
	times := rl.requests[key]
	var recent []time.Time
	for _, t := range times {
		if t.After(windowStart) {
			recent = append(recent, t)
		}
	}

	if len(recent) >= rl.limit {
		rl.requests[key] = recent
		return false
	}

	rl.requests[key] = append(recent, now)
	return true
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, times := range rl.requests {
			var recent []time.Time
			for _, t := range times {
				if t.After(now.Add(-rl.window)) {
					recent = append(recent, t)
				}
			}
			if len(recent) == 0 {
				delete(rl.requests, key)
			} else {
				rl.requests[key] = recent
			}
		}
		rl.mu.Unlock()
	}
}

func (s *Server) rateLimit(next http.Handler) http.Handler {
	matchLimiter := NewRateLimiter(10, time.Minute)
	impressionLimiter := NewRateLimiter(60, time.Minute)
	clickLimiter := NewRateLimiter(30, time.Minute)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var limiter *RateLimiter
		key := r.RemoteAddr

		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/v1/match":
			limiter = matchLimiter
			if startupID := r.URL.Query().Get("startup_id"); startupID != "" {
				key = startupID
			}
		case r.Method == http.MethodPost && r.URL.Path == "/v1/impressions":
			limiter = impressionLimiter
		case r.Method == http.MethodPost && r.URL.Path == "/v1/clicks":
			limiter = clickLimiter
		}

		if limiter != nil && !limiter.Allow(key) {
			http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
