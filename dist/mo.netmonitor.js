/*! 
 * Mikeotizels Network Monitor JS v1.0.0
 * Copyright 2024 Michael Otieno
 * Licensed under MIT 
 */

(() => {
    "use strict";

    /**
     * Class moNetworkMonitor
     * 
     * A lightweight utility class for detecting real internet connectivity in 
     * the browser.
     */
    class moNetworkMonitor {
        constructor({
            url = null,
            interval = 10000,
            onOnline = () => {},
            onOffline = () => {}
        } = {}) {
            this.url         = url;
            this.interval    = interval;
            this.onOnline    = onOnline;
            this.onOffline   = onOffline;
            this.wasOnline   = true;
            this.timer       = null;
            this.checkStatus = this.checkStatus.bind(this);
        }

        async isOnline() {
            if (!this.url) {
                return navigator.onLine;
            }

            try {
                const response = await fetch(this.url, { 
                    cache: 'no-store' 
                });
                return response.ok;
            } catch {
                return false;
            }
        }

        async checkStatus() {
            const online = await this.isOnline();

            if (online && !this.wasOnline) {
                this.onOnline();
            } else if (!online && this.wasOnline) {
                this.onOffline();
            }

            this.wasOnline = online;
        }

        start() {
            window.addEventListener('online', this.checkStatus);
            window.addEventListener('offline', this.checkStatus);
            this.checkStatus();
            this.timer = setInterval(this.checkStatus, this.interval);
        }

        stop() {
            window.removeEventListener('online', this.checkStatus);
            window.removeEventListener('offline', this.checkStatus);
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
        }
    }

    // Expose the moNetworkMonitor class globally
    window.moNetworkMonitor = moNetworkMonitor;
})();