# Changelog

## 2.0.0 - 2026-01-28

### Added

- `maxInterval` option.
- `backoffFactor` option.

- `onCheck` callback.
- `onChange` callback.

- Cache‑bust by appending the current timestamp to the ping URL to avoid cached responses.
- Method `HEAD` in fetch to retrieve headers only without the response body.
- Mode `no-cors` in fetch to check basic reachability without needing CORS headers.
- Custom `X-Heartbeat` header in fetch which can be used by the server to:
    - Recognize this request as a keep‑alive/ping check.
    - Skip heavy processing and just return a quick 'OK' or status code.
    - Log it separately from normal API calls.
- Support for **exponential backoff** when offline.

### Renamed

- `url` option to `pingUrl`.
- `interval` option to `pollInterval`.

### Removed

- `isOnline()` method.

## 1.0.0 - 2025-09-03

- Initial release
