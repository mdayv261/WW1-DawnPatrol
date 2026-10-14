// Stand-ins for the network, so the room server and the browser's client can be tested in
// Node: a socket that records what is sent and lets the test deliver messages, and timers
// that run only when the test says so.

export class FakeSocket {
  constructor(url = '') {
    this.url = url;
    this.listeners = {};
    this.sent = [];
    this.closed = null;
  }

  addEventListener(type, f) {
    (this.listeners[type] ??= []).push(f);
  }

  emit(type, event = {}) {
    for (const f of this.listeners[type] ?? []) f(event);
  }

  send(text) {
    if (this.closed) throw new Error('closed');
    this.sent.push(text);
  }

  // Messages sent so far, read back as objects (and forgotten).
  take() {
    return this.sent.splice(0).map((t) => JSON.parse(t));
  }

  close(code = 1000, reason = '') {
    if (this.closed) return;
    this.closed = { code, reason };
    this.emit('close', { code, reason });
  }

  // As the other end: deliver a message to whoever listens on this socket.
  receive(msg) {
    this.emit('message', { data: typeof msg === 'string' ? msg : JSON.stringify(msg) });
  }
}

export function fakeTimers() {
  const due = [];
  return {
    due,
    setTimeout(f, ms = 0) {
      const t = { f, ms };
      due.push(t);
      return t;
    },
    clearTimeout(t) {
      const i = due.indexOf(t);
      if (i >= 0) due.splice(i, 1);
    },
    setInterval: () => null,
    clearInterval: () => {},
    // Run everything waiting (and anything those add).
    runAll() {
      while (due.length) due.shift().f();
    },
  };
}
