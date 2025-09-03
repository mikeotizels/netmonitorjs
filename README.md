Mikeotizels Network Monitor JS
==============================

Version 1.0.0 - December 2024

A lightweight JavaScript utility for detecting **real** internet connectivity 
in the browser.  

## Features

- Checks **actual** connectivity, not just network interface status
- Instant detection via `online`/`offline` events
- Periodic polling to catch silent drops
- Configurable ping URL and polling interval
- Custom callback functions for online/offline state changes
- Simple start/stop lifecycle

--- 

## Installation

You can include it directly in your HTML:

```html
<script src="/path/to/mo.netmonitor.min.js"></script>
```

## Usage

```javascript
const monitor = new moNetworkMonitor({
    url: '/ping.txt', // small static file on your server
    interval: 5000, // 5 seconds
    onOnline: () => {
        console.log('✅ Connection restored');
        // TODO: Hide offline banner or show online alert
    },
    onOffline: () => {
        console.log('⚠️ Connection lost');
        // TODO: Show offline banner or show offline alert
    }
});

monitor.start();

// Later, if you want to stop monitoring:
//monitor.stop();
```

---

## Licensing

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file 
for the license terms.