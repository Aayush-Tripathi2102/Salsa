import express from "express";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import http from "http";
import url from "url";
import authRoutes from "./auth/routes.js";
import { config } from "./config.js";
import { verifyToken } from "./auth/service.js";

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

async function startServer() {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { query } = url.parse(req.url, true);
    const clientToken = query.token;
    if (!clientToken) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    try {
      const payload = verifyToken(clientToken);
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.username = payload.username;
        wss.emit("connection", ws, req);
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] 🌶️ ${ws.username} connected`);
    ws.send(JSON.stringify({ type: "auth", username: ws.username }));

    ws.on("message", (msg) => {
      const text = msg.toString();
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({ type: "chat", user: ws.username, text })
          );
        }
      });
    });

    ws.on("close", () => {
      const time = new Date().toLocaleTimeString();
      console.log(`[${time}] 👋 ${ws.username} disconnected`);
    });
  });

  server.listen(config.PORT, () => {
    console.log(`🚀 Salsa server running at ws://localhost:${config.PORT}`);
  });
}

startServer();
