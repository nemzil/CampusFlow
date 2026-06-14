/**
 * WebSocket Manager for Real-time Chat
 *
 * Key design decisions:
 * - Listeners are persistent across reconnects (not wiped on close/disconnect).
 * - Pages must call `clearListeners(owner)` on unmount to avoid stale-closure leaks.
 * - `connect()` is idempotent: calling it while already connected is a no-op.
 * - Auto-reconnect backs off exponentially but is cancelled on manual disconnect.
 */

class ChatWebSocket {
  constructor() {
    this.ws = null;
    this.token = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 8;
    this.reconnectTimeout = null;
    this.manuallyDisconnected = false;
  }

  connect(token) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.token = token;
    this.manuallyDisconnected = false;

    const isClient = typeof window !== 'undefined';
    let wsUrl = null;

    // Attempt to resolve from environment variables
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (apiBase) {
      try {
        const url = new URL(apiBase);
        const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws';
        // url.host automatically includes hostname and port (e.g. "127.0.0.1:8000")
        wsUrl = `${wsProtocol}://${url.host}/api/ws?token=${token}`;
      } catch (err) {
        console.error('Failed to parse NEXT_PUBLIC_API_BASE_URL:', err);
      }
    }

    // Fallback if no env var or parsing fails
    if (!wsUrl) {
      const protocol = isClient && window.location.protocol === 'https:' ? 'wss' : 'ws';
      const hostname = isClient ? window.location.hostname : '127.0.0.1';
      wsUrl = `${protocol}://${hostname}:8000/api/ws?token=${token}`;
    }

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('ws connected');
      this.reconnectAttempts = 0;
      this.emit('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
      } catch (error) {
        console.error('ws parse error:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('ws disconnected');
      this.ws = null;
      this.emit('disconnected', {});
      if (!this.manuallyDisconnected) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('ws error:', error);
      this.emit('error', { error });
    };
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('max reconnect attempts reached');
      this.emit('max_reconnect_failed', {});
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (!this.manuallyDisconnected && this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  /**
   * Register an event listener with an optional owner to isolate groups of listeners.
   */
  on(event, callback, owner = null) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    // Avoid double-registering the same callback
    const exists = this.listeners[event].some(item => item.callback === callback);
    if (!exists) {
      this.listeners[event].push({ callback, owner });
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(item => item.callback !== callback);
    }
  }

  emit(event, data) {
    const handlers = this.listeners[event];
    if (handlers && handlers.length > 0) {
      [...handlers].forEach(item => {
        try {
          item.callback(data);
        } catch (error) {
          console.error(`Error in "${event}" listener:`, error);
        }
      });
    }
  }

  send(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    } else {
      console.warn('WebSocket not connected, cannot send:', type);
    }
  }

  /**
   * Manually disconnect and cancel reconnects.
   */
  disconnect() {
    this.manuallyDisconnected = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
  }

  /**
   * Remove event listeners. Optionally filter by owner (e.g. 'page').
   */
  clearListeners(owner = null) {
    if (owner === null) {
      this.listeners = {};
    } else {
      for (const event in this.listeners) {
        this.listeners[event] = this.listeners[event].filter(item => item.owner !== owner);
      }
    }
  }

  isConnected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const chatWS = new ChatWebSocket();
