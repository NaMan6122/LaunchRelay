package api

import (
	"bytes"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
)

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

type EmailSender interface {
	SendMagicLink(to, link string) error
}

type SMTPConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	From     string
}

type smtpSender struct {
	cfg SMTPConfig
}

func NewEmailSender() EmailSender {
	provider := os.Getenv("EMAIL_PROVIDER")
	switch provider {
	case "smtp":
		return &smtpSender{
			cfg: SMTPConfig{
				Host:     envOr("SMTP_HOST", ""),
				Port:     envOr("SMTP_PORT", "587"),
				User:     envOr("SMTP_USER", ""),
				Password: envOr("SMTP_PASSWORD", ""),
				From:     envOr("SMTP_FROM", "noreply@launchrelay.com"),
			},
		}
	default:
		return &noopSender{}
	}
}

type noopSender struct{}

func (n *noopSender) SendMagicLink(to, link string) error {
	return nil
}

var magicLinkTmpl = template.Must(template.New("magic-link").Parse(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;">
<table width="480" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 12px; padding: 40px;">
<tr><td align="center" style="padding-bottom: 20px;">
<h1 style="font-size: 24px; margin: 0; color: #111;">Log in to LaunchRelay</h1>
</td></tr>
<tr><td style="padding-bottom: 24px; color: #555; font-size: 15px; line-height: 1.5; text-align: center;">
Click the button below to log in. This link expires in 15 minutes.
</td></tr>
<tr><td align="center" style="padding-bottom: 24px;">
<a href="{{.Link}}" style="display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">Log in to LaunchRelay</a>
</td></tr>
<tr><td align="center" style="color: #999; font-size: 13px;">
If you didn't request this, you can safely ignore this email.
</td></tr>
</table>
</td></tr></table>
</body>
</html>`))

func (s *smtpSender) SendMagicLink(to, link string) error {
	var body bytes.Buffer
	err := magicLinkTmpl.Execute(&body, map[string]string{"Link": link})
	if err != nil {
		return fmt.Errorf("render template: %w", err)
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "https://launchrelay.com"
	}

	headers := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: Log in to LaunchRelay\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n", s.cfg.From, to)
	msg := []byte(headers + body.String())

	addr := s.cfg.Host + ":" + s.cfg.Port
	auth := smtp.PlainAuth("", s.cfg.User, s.cfg.Password, s.cfg.Host)
	return smtp.SendMail(addr, auth, s.cfg.From, []string{to}, msg)
}
