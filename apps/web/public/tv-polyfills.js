/**
 * Runtime polyfills for Samsung Smart TV browsers.
 * Baseline: The Frame 2022 / Tizen 6.5 ≈ Chrome 85.
 *
 * Loaded beforeInteractive from the root layout. Every shim is guarded, so on
 * modern browsers this is a no-op. Only APIs newer than Chrome 85 belong
 * here; syntax downleveling of the app bundles themselves is handled by
 * scripts/tv-downlevel.mjs. (Shims for pre-85 engines were removed when the
 * supported baseline moved to Tizen 6.5 — see git history if ever needed.)
 */
(function () {
    'use strict';

    /* Array/String .at (Chrome 92) */
    function atImpl(n) {
        n = Math.trunc(n) || 0;
        if (n < 0) n += this.length;
        if (n < 0 || n >= this.length) return undefined;
        return this[n];
    }
    if (typeof Array.prototype.at !== 'function') {
        Object.defineProperty(Array.prototype, 'at', {
            configurable: true,
            writable: true,
            value: atImpl,
        });
    }
    if (typeof String.prototype.at !== 'function') {
        Object.defineProperty(String.prototype, 'at', {
            configurable: true,
            writable: true,
            value: atImpl,
        });
    }

    /* Object.hasOwn (Chrome 93) */
    if (typeof Object.hasOwn !== 'function') {
        Object.hasOwn = function (obj, key) {
            return Object.prototype.hasOwnProperty.call(Object(obj), key);
        };
    }

    /* Array.prototype.findLast / findLastIndex (Chrome 97) */
    if (typeof Array.prototype.findLast !== 'function') {
        Object.defineProperty(Array.prototype, 'findLast', {
            configurable: true,
            writable: true,
            value: function findLast(fn, thisArg) {
                for (var i = this.length - 1; i >= 0; i--) {
                    if (fn.call(thisArg, this[i], i, this)) return this[i];
                }
                return undefined;
            },
        });
    }
    if (typeof Array.prototype.findLastIndex !== 'function') {
        Object.defineProperty(Array.prototype, 'findLastIndex', {
            configurable: true,
            writable: true,
            value: function findLastIndex(fn, thisArg) {
                for (var i = this.length - 1; i >= 0; i--) {
                    if (fn.call(thisArg, this[i], i, this)) return i;
                }
                return -1;
            },
        });
    }

    /* crypto.randomUUID (Chrome 92) */
    if (window.crypto && typeof window.crypto.randomUUID !== 'function') {
        window.crypto.randomUUID = function () {
            var bytes = new Uint8Array(16);
            window.crypto.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            var hex = [];
            for (var i = 0; i < 16; i++) {
                hex.push((bytes[i] + 0x100).toString(16).slice(1));
            }
            return (
                hex.slice(0, 4).join('') +
                '-' +
                hex.slice(4, 6).join('') +
                '-' +
                hex.slice(6, 8).join('') +
                '-' +
                hex.slice(8, 10).join('') +
                '-' +
                hex.slice(10, 16).join('')
            );
        };
    }

    /* structuredClone (Chrome 98) — JSON-based approximation, sufficient for
       plain state objects (drops functions, Dates become strings). Guarded so
       real engines never see it. */
    if (typeof window.structuredClone !== 'function') {
        window.structuredClone = function (value) {
            if (value === undefined) return undefined;
            return JSON.parse(JSON.stringify(value));
        };
    }
})();
