package api

import (
	"encoding/json"
	"net/http"
)

type ErrorResponse struct {
	Error  string `json:"error"`
	Detail string `json:"detail,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string, detail ...string) {
	resp := ErrorResponse{Error: msg}
	if len(detail) > 0 {
		resp.Detail = detail[0]
	}
	writeJSON(w, status, resp)
}

func writeOK(w http.ResponseWriter, v any) {
	writeJSON(w, http.StatusOK, v)
}

func writeCreated(w http.ResponseWriter, v any) {
	writeJSON(w, http.StatusCreated, v)
}

func writeNoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}
