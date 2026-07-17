(function () {
  var LS_KEY = 'lr_last_impression';
  var ENDPOINT = '/v1/conversions';

  // Persist lr_ref from URL for cross-page attribution
  var params = new URLSearchParams(window.location.search);
  var ref = params.get('lr_ref');
  if (ref) {
    try {
      localStorage.setItem(LS_KEY, ref);
    } catch (_) { /* localStorage unavailable */ }
    return; // Don't fire conversion on the landing page
  }

  // No lr_ref in URL → this is the conversion page. Fire if we have a stored impression.
  var impressionId = null;
  try {
    impressionId = localStorage.getItem(LS_KEY);
  } catch (_) { /* silent */ }

  if (!impressionId) return;

  // Clear immediately to prevent duplicate sends
  try {
    localStorage.removeItem(LS_KEY);
  } catch (_) { /* silent */ }

  // Read startup_id from data attribute on the script tag
  var script = document.currentScript as HTMLScriptElement | null;
  var startupId = script ? (script.getAttribute('data-startup-id') || '') : '';

  if (!startupId) return;

  var payload = JSON.stringify({
    impression_id: impressionId,
    startup_id: startupId,
  });

  try {
    navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
  } catch (_) { /* silent */ }
})();
