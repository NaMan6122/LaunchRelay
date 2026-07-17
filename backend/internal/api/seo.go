package api

import (
	"fmt"
	"net/http"
	"strings"
	"time"
)

func (s *Server) handleRobotsTxt() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Write([]byte("User-agent: *\nAllow: /\n\nSitemap: https://launchrelay.com/sitemap.xml\n"))
	}
}

func (s *Server) handleSitemapXML() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		base := "https://launchrelay.com"

		var urls []string
		urls = append(urls, fmt.Sprintf(`  <url><loc>%s/</loc><priority>1.0</priority></url>`, base))
		urls = append(urls, fmt.Sprintf(`  <url><loc>%s/about</loc><priority>0.8</priority></url>`, base))
		urls = append(urls, fmt.Sprintf(`  <url><loc>%s/directory</loc><priority>0.9</priority></url>`, base))
		urls = append(urls, fmt.Sprintf(`  <url><loc>%s/login</loc><priority>0.3</priority></url>`, base))
		urls = append(urls, fmt.Sprintf(`  <url><loc>%s/apply</loc><priority>0.7</priority></url>`, base))

		rows, err := s.db.Query(`SELECT slug, updated_at FROM startups WHERE status = 'active' ORDER BY slug`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var slug string
				var updatedAt time.Time
				rows.Scan(&slug, &updatedAt)
				lastmod := updatedAt.Format("2006-01-02")
				urls = append(urls, fmt.Sprintf(`  <url><loc>%s/directory/%s</loc><lastmod>%s</lastmod><priority>0.6</priority></url>`, base, slug, lastmod))
			}
		}

		xml := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
%s
</urlset>`, strings.Join(urls, "\n"))

		w.Header().Set("Content-Type", "application/xml; charset=utf-8")
		w.Write([]byte(xml))
	}
}
