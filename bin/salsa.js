#!/usr/bin/env node
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, "../server/server.js");
const clientPath = path.join(__dirname, "../client/client.js");
const pidFile = path.join(__dirname, "../salsa-server.pid");

const command = process.argv[2];

function isServerRunning() {
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, "utf8"));
      process.kill(pid, 0); // check process
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function startServer() {
  console.log("🌶️ Salsa server not running. Starting it in background...");
  const child = spawn("node", [serverPath], {
    detached: true,
    stdio: "ignore",
  });
  fs.writeFileSync(pidFile, child.pid.toString());
  child.unref(); // let it run independently
}

async function startClient() {
  const { default: client } = await import(clientPath);
  client();
}

switch (command) {
  case "connect":
    if (!isServerRunning()) startServer();
    setTimeout(() => {
      startClient();
    }, 1000); // give server a sec to start
    break;

  case "stop":
    if (isServerRunning()) {
      const pid = parseInt(fs.readFileSync(pidFile, "utf8"));
      process.kill(pid);
      fs.unlinkSync(pidFile);
      console.log("🛑 Salsa server stopped.");
    } else {
      console.log("⚠️ Salsa server not running.");
    }
    break;

  default:
    console.log("Usage: salsa <connect|stop>");
}
