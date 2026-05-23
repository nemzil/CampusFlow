/**
 * WebSocket Manager for Real-time Chat
 *
 * Key design decisions:
 * - Listeners are persistent across reconnects (not wiped on close/disconnect).
 * - Pages must call `clearListeners()` on unmount to avoid stale-closure leaks.
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
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.token = token;
    this.manuallyDisconnected = false;

    const isClient = typeof window !== 'undefined';
    const protocol = isClient && window.location.protocol === 'https:' ? 'wss' : 'ws';
    const hostname = isClient ? window.location.hostname : 'localhost';
    const wsUrl = `${protocol}://${hostname}:8000/api/ws?token=${token}`;

    console.log('Connecting WebSocket to', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      this.ws = null;
      this.emit('disconnected', {});
      if (!this.manuallyDisconnected) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { error });
      // onclose will fire after onerror, which will trigger reconnect
    };
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_failed', {});
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (!this.manuallyDisconnected && this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  /**
   * Register an event listener.
   * Listeners persist across reconnects — clear them on page unmount via clearListeners().
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    // Avoid double-registering the same callback
    if (!this.listeners[event].includes(callback)) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    const handlers = this.listeners[event];
    if (handlers && handlers.length > 0) {
      handlers.forEach(callback => {
        try {
          callback(data);
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
   * Does NOT clear listeners so they survive a subsequent connect() call.
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
   * Remove all event listeners. Call this on page unmount to prevent
   * stale-closure memory leaks from captured React state.
   */
  clearListeners() {
    this.listeners = {};
  }

  isConnected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const chatWS = new ChatWebSocket();
