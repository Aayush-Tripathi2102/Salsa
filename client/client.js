import blessed from "blessed";
import WebSocket from "ws";
import fs from "fs";
import os from "os";
import path from "path";
import inquirer from "inquirer";
import fetch from "node-fetch";

const tokenDir = path.join(os.homedir(), ".salsa");
if (!fs.existsSync(tokenDir)) fs.mkdirSync(tokenDir);

async function authFlow() {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Choose account flow:",
      choices: ["login", "signup", "use saved account"],
    },
  ]);

  if (action === "use saved account") {
    const files = fs.readdirSync(tokenDir);
    if (!files.length) {
      console.log("❌ No saved accounts. Please login/signup first.");
      return authFlow();
    }
    const { chosen } = await inquirer.prompt([
      {
        type: "list",
        name: "chosen",
        message: "Select account:",
        choices: files,
      },
    ]);
    return JSON.parse(fs.readFileSync(path.join(tokenDir, chosen), "utf-8"));
  }

  const { username, password } = await inquirer.prompt([
    { type: "input", name: "username", message: "Username:" },
    { type: "password", name: "password", message: "Password:" },
  ]);

  if (action === "signup") {
    await fetch("http://localhost:3000/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  }

  const res = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!data.token) {
    console.error("❌ Login failed");
    process.exit(1);
  }

  fs.writeFileSync(
    path.join(tokenDir, `${username}.json`),
    JSON.stringify({ token: data.token, username }),
    "utf-8"
  );

  return { token: data.token, username };
}

function startChatApp({ token, username }) {
  const screen = blessed.screen({
    smartCSR: true,
    mouse: false,
    title: "🌶️ Salsa Chat",
    fullUnicode: true,
    sendFocus: false,
    autopadding: false,
  });

  const header = blessed.box({
    top: 0,
    height: 1,
    width: "100%",
    content: "{center}🌶 Salsa Chat - Real-time messaging{/center}",
    tags: true,
    keys: false,
    style: { fg: "white", bg: "blue" },
  });

  const chatBox = blessed.box({
    top: 1,
    left: 0,
    width: "100%",
    bottom: 4,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: " ", track: { bg: "grey" }, style: { bg: "red" } },
    keys: false, // Disable keys on chatBox to prevent conflicts
    mouse: false,
    border: { type: "line" },
    tags: true,
  });

  const statusBox = blessed.box({
    bottom: 2,
    height: 1,
    width: "100%",
    content: "Status: {yellow-fg}Connecting...{/yellow-fg}",
    tags: true,
    keys: false,
    style: { fg: "white", bg: "black" },
  });

  const helpBox = blessed.box({
    bottom: 1,
    height: 1,
    width: "100%",
    content: "/logout = logout • /quit or /exit = quit • ESC/q = quit",
    tags: true,
    style: { fg: "gray", bg: "black" },
  });

  const inputBox = blessed.textbox({
    bottom: 0,
    height: 1,
    width: "100%",
    inputOnFocus: true,
    keys: false,
    mouse: false,
    style: { fg: "white", bg: "black" },
  });

  inputBox.readInput = false;
  screen.append(header);
  screen.append(chatBox);
  screen.append(statusBox);
  screen.append(helpBox);
  screen.append(inputBox);

  inputBox.focus();

  const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

  ws.on("open", () => {
    statusBox.setContent("Status: {green-fg}Connected{/green-fg}");
    screen.render();
  });

  ws.on("close", () => {
    statusBox.setContent("Status: {red-fg}Disconnected{/red-fg}");
    screen.render();
  });

  ws.on("error", (err) => {
    statusBox.setContent(`Status: {red-fg}Error: ${err.message}{/red-fg}`);
    screen.render();
  });

  ws.on("message", (msg) => {
    const data = JSON.parse(msg.toString());
    const time = new Date().toLocaleTimeString();

    if (data.type === "auth") {
      chatBox.pushLine(
        `{green-fg}[${time}] ${data.username} joined{/green-fg}`
      );
    } else if (data.type === "chat") {
      chatBox.pushLine(`[${time}] ${data.user}: ${data.text}`);
    }

    chatBox.setScrollPerc(100);
    screen.render();
  });

  inputBox.on("submit", (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      inputBox.clearValue();
      screen.render();
      return;
    }

    if (trimmed === "/logout" || trimmed === "//llooggoouutt") {
      ws.close();
      try {
        fs.unlinkSync(path.join(tokenDir, `${username}.json`));
      } catch {}
      chatBox.pushLine("{red-fg}You have been logged out{/red-fg}");
      statusBox.setContent("Status: {yellow-fg}Logged out{/yellow-fg}");
      screen.render();
      setTimeout(() => process.exit(0), 500);
    } else if (trimmed === "/quit" || trimmed === "/exit") {
      ws.close();
      chatBox.pushLine("{cyan-fg}You left the chat{/cyan-fg}");
      statusBox.setContent("Status: {yellow-fg}Disconnected{/yellow-fg}");
      screen.render();
      setTimeout(() => process.exit(0), 500);
    } else {
      if (ws.readyState === WebSocket.OPEN) ws.send(trimmed);
    }

    inputBox.clearValue();
    screen.render();
    inputBox.focus();
  });

  // Handle screen-level navigation keys - only when input is not focused
  screen.key(["escape", "q"], function (ch, key) {
    if (screen.focused !== inputBox) {
      process.exit(0);
    }
  });

  screen.key(["C-c"], () => process.exit(0));

  // Scroll keys - only work when chatBox area is focused or input is not focused
  screen.key(["up", "k"], function (ch, key) {
    if (screen.focused !== inputBox || !inputBox.focused) {
      chatBox.scroll(-1);
      screen.render();
    }
  });

  screen.key(["down", "j"], function (ch, key) {
    if (screen.focused !== inputBox || !inputBox.focused) {
      chatBox.scroll(1);
      screen.render();
    }
  });

  screen.key(["pageup", "b"], function (ch, key) {
    if (screen.focused !== inputBox || !inputBox.focused) {
      chatBox.scroll(-5);
      screen.render();
    }
  });

  screen.key(["pagedown", "space"], function (ch, key) {
    if (screen.focused !== inputBox || !inputBox.focused) {
      chatBox.scroll(5);
      screen.render();
    }
  });

  screen.key("g", function (ch, key) {
    if (screen.focused !== inputBox || !inputBox.focused) {
      chatBox.setScroll(0);
      screen.render();
    }
  });

  screen.key("G", function (ch, key) {
    if (screen.focused !== inputBox || !inputBox.focused) {
      chatBox.setScrollPerc(100);
      screen.render();
    }
  });

  screen.render();
}

export default async function startClient() {
  const { token, username } = await authFlow();
  startChatApp({ token, username });
}
