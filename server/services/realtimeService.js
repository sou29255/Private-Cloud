// Real-time Server-Sent Events (SSE) Broadcast Hub with Stable Heartbeat
class RealtimeService {
  constructor() {
    this.clients = new Set();
    // Heartbeat every 20 seconds to keep connections alive and prevent client reconnect storms
    setInterval(() => {
      this.clients.forEach((client) => {
        try {
          client.write(': heartbeat\n\n');
        } catch (err) {
          this.clients.delete(client);
        }
      });
    }, 20000);
  }

  addClient(res) {
    this.clients.add(res);
    try {
      res.write(': connected\n\n');
    } catch (e) {}

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(eventType, payload) {
    const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
    const formattedMessage = `event: ${eventType}\ndata: ${data}\n\n`;

    this.clients.forEach((client) => {
      try {
        client.write(formattedMessage);
      } catch (err) {
        this.clients.delete(client);
      }
    });
  }
}

module.exports = new RealtimeService();
