Mikeotizels Network Monitor JS
==============================

Version 2.0.0 - January 28, 2026

A lightweight JavaScript utility for tracking network connection in the browser.

It provides real-time information about the user's network connection status, (online/offline), ping latency, connection quality (2G/3G/4G), bandwidth estimate, and more.

It can be used to notify users or adjust application behavior when the network is unavailable. It could also be used to select high or low definition content based on the connection quality.

---

## Features

- ✅ Checks **actual** connectivity, not just network interface status
- ⚡ Instant detection via native `online`/`offline` events (if supported)
- 🔄 Periodic polling to catch silent drops
- 🛠 Configurable ping URL and polling interval
- 🎯 Custom callback functions for connection state changes
- 🧩 Simple start/stop lifecycle so you can remove listeners and timers cleanly

---

## Installation

You can include the script directly in your HTML:

```html
<script src="path/to/mo.netmonitor.min.js"></script>
```

## Usage

```js
const netMonitor = new moNetworkMonitor({
    pingUrl: '/ping.txt', // Use a small, reliable resource on your server
    pollInterval: 5000, // Initially check after 5 seconds
    maxInterval: 600000, // 60 seconds
    onCheck: (context) => {
        console.log('Checking connection...');
        console.log(context);
        // → show refreshing message with a countdown timer using the value 
        //   of `context.interval` if `context.status` is 'offline'
    },
    onOnline: (timestamp) => {
        console.info(`Connection restored: ${timestamp}`);
        // → hide offline banner or alert
    },
    onOffline: (timestamp) => {
        console.info(`Connection lost: ${timestamp}`);
        // → show offline banner or alert with an optional "Refresh" button
    },
    onChange: ({ effectiveType, previousEffectiveType }) => {
        console.log(`Connection changed: ${previousEffectiveType} → ${effectiveType}`);
        // → reduce image or video quality on 'slow-2g' / '2g'
    }
});

// Start the monitor
netMonitor.start();

// Later, if you want to stop monitoring:
//netMonitor.stop();
```

---

## API

### Options

Bellow are the available configuration options for the class constructor:

| Option          | Type     | Default     | Description |
|-----------------|----------|-------------|-------------|
| `pingUrl`       | String   | `null`      | URL to request for connectivity checks. This should point to a tiny, always‑available file or endpoint on your server. If null, a basic check with `navigator.onLine` is performed |
| `pollInterval`  | Number   | `10000`     | The time in milliseconds after which the initial ping request will be sent |
| `maxInterval`   | Number   | `60000`     | Maximum polling interval in milliseconds |
| `backoffFactor` | Number   | `2`         | Exponential backoff multiplier |
| `onCheck`       | Function | `() => {}`  | Callback function when connection is checked |
| `onOnline`      | Function | `() => {}`  | Callback function when connection is restored|
| `onOffline`     | Function | `() => {}`  | Callback function when connection is lost |
| `onChange`      | Function | `() => {}`  | Callback function when effective type change |

---

### Methods

Bellow are the available public methods:

- `start()` - Starts network connection monitoring.
- `stop()`  - Stops network connection monitoring.

---

### Callbacks

Once the tool is monitoring network status, the callbacks will actively receive rich context data.

When `onCheck` is triggered, it receives:

| Property     | Type   | Description                                          |
|--------------|--------|------------------------------------------------------|
| `timestamp`  | Number | Unix timestamp of when the check was invoked         |
| `interval`   | Number | The current polling interval, in milliseconds        |
| `latency`    | Number | How long each ping request takes, in milliseconds    |
| `status`     | String | The last known network status; 'online' or 'offline' |
| `connection` | Object | An object containing information about the system's connection, such as the current bandwidth of the user's device or whether the connection is metered (limited availability) |

Properties of `connection` object (not supported in Firefox and Safari):

- `downlink`: The effective bandwidth estimate in megabits per second (Mbps), rounded to the nearest multiple of 25 kilobits per seconds.
- `effectiveType`: The effective connection type (e.g., slow-2g, 2g, 3g, 4g). This value is determined using a combination of recently observed round-trip time and downlink values.
- `rtt`: The estimated effective round-trip time of the current connection, rounded to the nearest multiple of 25 milliseconds.
- `saveData`: Boolean indicating if the user has enabled a reduced data usage mode. True if the user has set a reduced data usage option on the user agent, otherwise false.
- `type`: (Experimental) The type of connection a device is using to communicate with the network. It may be one of "cellular", "ethernet", "wifi", or "unknown".

> Note that true ICMP ping (as done by the command-line `ping` tool) is not possible in browser-based JS due to security restrictions—no low-level socket access. The latency and connection results may not match exact ping statistics (e.g., no true ICMP packets are sent or received).


When `onOnline` or `onOffline` is triggered, it receives:

| Property    | Type   | Description                                       |
|-------------|--------|---------------------------------------------------|
| `timestamp` | Number | Unix timestamp of when the status was detected    |


When `onChange` is triggered, it receives:

| Property    | Type   | Description                                       |
|-------------|--------|---------------------------------------------------|
| `timestamp` | Number | Unix timestamp of when the change was detected    |
| `effectiveType` | String | The current effective connection type |
| `previousEffectiveType` | String | The last known effective connection type |
| `source` | String | Optional. This is set to 'poll' to distinguish from real event |

Other known properties of the `connection` object may also be returned if the change is triggered by the native event. 

---

## How it works

- Uses the native `online`/`offline` events for instant detection.
- Periodically fetches the configured ping URL to confirm reachability and measures latency (falls back to `navigator.onLine` if the URL is not provided).
- Uses exponential backoff when offline — checks more frequently at first, then slows down. This reduces server load if the outage is long.
- Tracks the **previous state** so it only alerts on changes, not every poll.

## Best practice: host your own "ping" file or endpoint

Instead of hitting a public site or even your `favicon.ico` (which might be cached aggressively), create a dedicated, tiny file in your own domain, for example:

```
/ping.txt
```

Contents could be as simple as:

```
OK
```

Even better (if you use an API endpoint): return `204 No Content` or very small `200 OK`.

This way:

- You're not stressing any third‑party service
- You can make it as small as possible (just a few bytes)
- You can configure server headers to **disable caching** the ping file or endpoint

> Note: The "ping" request uses the HTTP `HEAD` method instead of `GET`, as only response headers are required and the body is unnecessary. If the fetch operation succeeds (including opaque responses caused by CORS restrictions) or if the server returns `405 Method Not Allowed` when `HEAD` is unsupported, the endpoint is considered online.

---

**If you must use an external URL**

Pick something that is:

- Designed for uptime monitoring
- Served from a CDN edge close to your users (so false negatives are rare)
- Known to be lightweight (so it transfers quickly and uses minimal bandwidth)

Examples people often use:

- `https://www.gstatic.com/generate_204` (Google's 204‑No Content endpoint used by Android captive portal detection — returns instantly with no body)
- `https://httpbin.org/status/204` (public test endpoint, but less reliable)
- A small static asset on a CDN you control

⚠ **Caution:** Even with a tiny request, polling every sub‑10 seconds to a third‑party service can be seen as abuse. If you can, **self‑host**.

---

## Licensing

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for the license terms.
