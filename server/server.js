import { WebSocketServer } from "ws";
import http from "http";
import { config } from "./config.js";

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] 🌶️ New client connected`);

  ws.on("message", (msg) => {
    const data = msg.toString();

    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on("close", () => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] 👋 Client disconnected`);
  });
});

server.listen(config.PORT, () => {
  console.log(`🚀 Salsa server running at ws://localhost:${config.PORT}`);
});
