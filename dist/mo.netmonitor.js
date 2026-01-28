/*!
 * Mikeotizels Network Monitor JS
 * 
 * https://github.com/mikeotizels/netmonitorjs
 * 
 * @package   Mikeotizels/Web/Toolkit
 * @author    Michael Otieno <mikeotizels@gmail.com>
 * @copyright Copyright 2025-2026 Michael Otieno. All Rights Reserved.
 * @license   The MIT License (http://opensource.org/licenses/MIT)
 * @version   2.0.0
 */

(() => {
    "use strict";

    /**
     * moNetworkMonitor class to track network status.
     *
     * @class
     */
    window.moNetworkMonitor = class {
        /**
         * Constructor
         * 
         * @since 1.0.0
         * @since 2.0.0 Renamed `url` option to `pingUrl`.
         * @since 2.0.0 Renamed `interval` option to `pollInterval`.
         * @since 2.0.0 Added `maxInterval` option.
         * @since 2.0.0 Added `backoffFactor` option.
         * @since 2.0.0 Added `onCheck` callback.
         * @since 2.0.0 Added `onChange` callback.
         * @since 2.0.0 Removed `isOnline()` method.
         * 
         * @param {Object} [options={}] - Configuration options.
         */
        constructor(options = {}) {
            // Configuration options
            this.options = options;

            // Ping settings
            this.pingUrl         = this.options.pingUrl       || null;
            //this.pingMethod     = this.options.pingMethod     || 'HEAD';

            // Polling settings
            this.pollInterval    = this.options.pollInterval  || 10000; // 10s
            this.maxInterval     = this.options.maxInterval   || 60000; // 60s
            this.backoffFactor   = this.options.backoffFactor || 2;
            this.currentInterval = this.pollInterval;

            // Callback functions
            this.onCheck   = typeof this.options.onCheck   === "function" 
                ? this.options.onCheck
                : () => {};
            this.onOnline  = typeof this.options.onOnline  === "function" 
                ? this.options.onOnline
                : () => {};
            this.onOffline = typeof this.options.onOffline === "function" 
                ? this.options.onOffline
                : () => {};
            this.onChange  = typeof this.options.onChange  === "function"
                ? this.options.onChange
                : () => {};
           
            // Internal variables
            this._lastStatus        = 'online';
            this._lastEffectiveType = null;
            this._checkTimer        = null;

            // Bind network connection checker
            this._check = this._check.bind(this);

            // @since 2.0.0 Bind network status change handlers
            this.onlineHandler  = () => this._handleStatusChange(true);
            this.offlineHandler = () => this._handleStatusChange(false);

            // @since 2.0.0 Bind network info change handler
            this._connectionChangeSupported = false;
            this._handleConnectionChange    = this._handleConnectionChange.bind(this);
        }
        
        /**
         * Starts connection monitoring.
         * 
         * @since 1.0.0
         */
        start() {
            // Listen to browser's native events for instant detection
            window.addEventListener('online',  this.onlineHandler);
            window.addEventListener('offline', this.offlineHandler);

            // Set up NetworkInformation change listener
            this._setupConnectionChangeListener();

            // Poll periodically for connectivity
            this._scheduleCheck();
        }
        
        /**
         * Stops connection monitoring.
         * 
         * @since 1.0.0
         */
        stop() {
            // Remove the listeners
            window.removeEventListener('online',  this.onlineHandler);
            window.removeEventListener('offline', this.offlineHandler);

            // Remove NetworkInformation listener (if supported)
            const connection = this._getConnection();
            if (connection && this._connectionChangeSupported) {
                connection.removeEventListener('change', this._handleConnectionChange);
            }

            // Stop any polling
            if (this._checkTimer) {
                clearInterval(this._checkTimer);
                this._checkTimer = null;
            }
        }

        /**
         * Performs a network connectivity check.
         * 
         * Optionally sends requests to the server for network connectivity and
         * measures latency.
         * 
         * @since 1.0.0
         * @since 2.0.0 Added code from previous `isOnline()` method.
         * @since 2.0.0 Added cache‑bust by appending the current timestamp to
         *              the ping URL to avoid cached responses.
         * @since 2.0.0 Uses HTTP method HEAD instead of GET since we need to
         *              retrieve headers only, without the response body.
         * @since 2.0.0 Added mode `no-cors` in fetch options to help avoid 
         *              cross-origin issues.
         * @since 2.0.0 Added custom `X-Heartbeat` header which can be used by 
         *              the server to:
         *              - Recognize this request as a keep‑alive/ping check.
         *              - Skip heavy processing and just return a quick 'OK' or 
         *                status code.
         *              - Log it separately from normal API calls.
         * @since 2.0.0 Added signal: AbortController + timeout (10 s) on fetch.
         * @since 2.0.0 If fetch succeeds (even with opaque response), assumes 
         *              online since we do need to inspect the response.
         * @since 2.0.0 Added support for automatic backoff when offline.
         * 
         * @private
         */
        async _check() {
            const startTime = window.performance.now();
            let isOnline    = navigator?.onLine ?? false;
            let latency     = null;

            if (this.pingUrl) {
                try {
                    const controller = new AbortController();
                    const timeoutId  = setTimeout(() => controller.abort(), 10000);

                    // Perform a ping to measure latency
                    await fetch(`${this.pingUrl}?_=${Date.now()}`, {
                        method: 'HEAD',    // lighter than GET
                        mode: 'no-cors',   // Avoid CORS issues
                        cache: 'no-store', // Prevent caching
                        signal: controller.signal, // Allow timeout
                        headers: {
                            'X-Heartbeat': 'true' // Custom signal
                        }
                    });

                    // TODO: Should we inspect the response to avoid false positives?

                    clearTimeout(timeoutId);

                    isOnline = true;
                    latency  = window.performance.now() - startTime;
                } catch {
                    // Assume offline if request fails
                    isOnline = false;
                }
            }

            const currentStatus = isOnline ? 'online' : 'offline';

            // Status change handling + backoff
            // Check if status has changed to avoid redundant alerts
            if (currentStatus !== this._lastStatus) {
                // Emit status update to change handler
                this._handleStatusChange(isOnline);
            } else {
                if (isOnline) {
                    // Reset interval when online
                    this.currentInterval = this.pollInterval;
                } else {
                    // Increase interval when still offline (up to the maximum)
                    this.currentInterval = Math.min(
                        this.currentInterval * this.backoffFactor,
                        this.maxInterval
                    );
                }
            }

            const connectionInfo = this._getConnectionInfo();

            // Trigger onCheck callback
            this.onCheck({
                timestamp: Date.now(),
                interval: this.currentInterval,
                latency,
                status: currentStatus,
                connection: connectionInfo
            });

            // Handle network type changes if supported
            const currentEffectiveType = connectionInfo?.effectiveType ?? null;

            if (currentEffectiveType !== this._lastEffectiveType) {
                const prevEffectiveType = this._lastEffectiveType;
                this._lastEffectiveType = currentEffectiveType;

                this.onChange({
                    timestamp: Date.now(),
                    effectiveType: currentEffectiveType,
                    previousEffectiveType: prevEffectiveType,
                    source: 'poll'  // to distinguish from real event
                });
            }

            // Schedule next check
            this._scheduleCheck();
        }

        /**
         * Schedules next connection check.
         * 
         * @since 2.0.0
         * 
         * @private
         */
        _scheduleCheck() {
            // Clear old check timer
            if (this._checkTimer) {
                clearInterval(this._checkTimer);
            }

            // Start new check timer
            this._checkTimer = setTimeout(() => this._check(), this.currentInterval);
        }

        /**
         * Handles network status change.
         * 
         * @since 2.0.0
         * 
         * @private
         */
        _handleStatusChange(isOnline) {
            const currentTimestamp = Date.now();

            if (isOnline) {
                this.onOnline(currentTimestamp);
            } else {
                this.onOffline(currentTimestamp);
            }

            // Reset poll interval
            this.currentInterval = this.pollInterval;

            // Update last known status
            this._lastStatus = isOnline ? 'online' : 'offline';
        }

        /**
         * Sets up listener for NetworkInformation 'change' events if supported.
         * 
         * @since 2.0.0
         * 
         * @private
         */
        _setupConnectionChangeListener() {
            const connection = this._getConnection();

            if (connection && typeof connection.addEventListener === 'function') {
                connection.addEventListener('change', this._handleConnectionChange);
                this._connectionChangeSupported = true;
                this._lastEffectiveType = connection.effectiveType ?? null;
            } else {
                this._connectionChangeSupported = false;
            }
        }

        /**
         * Handles 'change' event from navigator.connection.
         * 
         * Triggers onChange callback when effectiveType changes.
         * 
         * @since 2.0.0
         * 
         * @private
         */
        _handleConnectionChange() {
            const connection = this._getConnection();

            if (!connection) return;

            const newEffectiveType = connection.effectiveType ?? null;

            if (newEffectiveType !== this._lastEffectiveType) {
                const prevEffectiveType = this._lastEffectiveType;
                this._lastEffectiveType = newEffectiveType;

                // Trigger the callback
                this.onChange({
                    timestamp: Date.now(),
                    effectiveType: newEffectiveType,
                    previousEffectiveType: prevEffectiveType,
                    // Optional: include more info if useful
                    downlink: connection.downlink ?? null,
                    rtt: connection.rtt ?? null,
                    saveData: connection.saveData ?? null,
                    type: connection.type ?? null
                });
            }
        }

        /**
         * Gets network connection information (if supported).
         * 
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/connection
         * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
         * 
         * @since 2.0.0
         *
         * @returns {Object|null} Returns a plain object with current network 
         *                        connection details (if available). 
         *                        Returns `null` if the Network Information API 
         *                        is not supported.
         * 
         * @private
         */
        _getConnectionInfo() {
            const connection = this._getConnection();

            if (typeof connection == 'undefined' || connection == null) {
                return null;
            }

            // Safely extract known stable properties
            return {
                downlink:      connection.downlink      ?? null,   // Mbps estimate (often capped)
                // Deliberately NOT including downlinkMax — poor support & low value in 2026
                effectiveType: connection.effectiveType ?? null,   // "slow-2g" | "2g" | "3g" | "4g"
                rtt:           connection.rtt           ?? null,   // ms, rounded
                saveData:      connection.saveData      ?? null,   // boolean
                type:          connection.type          ?? null    // "wifi" | "cellular" | "ethernet" | ...
            };
        }

        /**
         * Gets network connection object (if supported).
         * 
         * @since 2.0.0
         * 
         * @todo moz|webkitConnection almost dead in 2026 – can be removed.
         * 
         * @private
         */
        _getConnection() {
            return navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection || null;
        }
    }
})();
