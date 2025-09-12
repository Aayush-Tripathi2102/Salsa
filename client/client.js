import blessed from "blessed";
import WebSocket from "ws";

export default function startClient() {
  const screen = blessed.screen({
    smartCSR: true,
    title: "🌶️ Salsa Chat",
    fullUnicode: true,
  });

  const header = blessed.box({
    top: 0,
    left: 0,
    height: 1,
    width: "100%",
    content: "{center}🌶 Salsa Chat - Real-time messaging{/center}",
    tags: true,
    style: { fg: "white", bg: "blue" },
  });

  const chatBox = blessed.box({
    top: 1,
    left: 0,
    width: "100%",
    bottom: 3,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: " ", track: { bg: "grey" }, style: { bg: "red" } },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    border: { type: "line" },
  });

  const statusBox = blessed.box({
    bottom: 1,
    left: 0,
    height: 1,
    width: "100%",
    content: "Status: {green-fg}Connected{/green-fg}",
    tags: true,
    style: { fg: "white", bg: "green" },
  });

  const inputBox = blessed.textbox({
    bottom: 0,
    left: 0,
    height: 1,
    width: "100%",
    inputOnFocus: true,
    style: { fg: "white", bg: "black" },
  });

  screen.append(header);
  screen.append(chatBox);
  screen.append(statusBox);
  screen.append(inputBox);
  inputBox.focus();

  const ws = new WebSocket("ws://localhost:3000");

  ws.on("message", (msg) => {
    const time = new Date().toLocaleTimeString();
    const message = msg.toString();

    // Avoid showing "You:" again for your own messages
    if (!message.includes("You:")) {
      chatBox.pushLine(`[${time}] ${message}`);
      chatBox.setScrollPerc(100);
      screen.render();
    }
  });

  inputBox.on("submit", (text) => {
    if (text.trim()) {
      ws.send(text.trim());
      const time = new Date().toLocaleTimeString();
      // chatBox.pushLine(`[${time}] You: ${text.trim()}`);
      // chatBox.setScrollPerc(100);
    }
    inputBox.clearValue();
    screen.render();
    inputBox.focus();
  });

  screen.key(["escape", "q", "C-c"], () => process.exit(0));
  screen.key(["up", "k"], () => {
    chatBox.scroll(-1);
    screen.render();
  });
  screen.key(["down", "j"], () => {
    chatBox.scroll(1);
    screen.render();
  });
  screen.key(["pageup", "b"], () => {
    chatBox.scroll(-5);
    screen.render();
  });
  screen.key(["pagedown", "space"], () => {
    chatBox.scroll(5);
    screen.render();
  });
  screen.key("g", () => {
    chatBox.setScroll(0);
    screen.render();
  });
  screen.key("G", () => {
    chatBox.setScrollPerc(100);
    screen.render();
  });

  screen.render();
}
