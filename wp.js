// wp.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const express = require("express");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const authFolder = './auths';
if (!fs.existsSync(authFolder)) fs.mkdirSync(authFolder);

// CREATE SESSION + QR
app.post("/generate", async (req, res) => {
  const { number } = req.body;
  const folder = `${authFolder}/${number}`;
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(folder);
  const sock = makeWASocket({ auth: state });

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) {
      console.log("QR:", qr);
      fs.writeFileSync(`${folder}/qr.txt`, qr);
    }
    if (connection === "open") {
      console.log("✅ Connected:", number);
      res.json({ status: "connected" });
    }
    if (connection === "close") {
      const reason = new Boom(update.lastDisconnect?.error)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) res.json({ status: "closed" });
    }
  });

  sock.ev.on("creds.update", saveCreds);
});

// SEND MESSAGE
app.post("/send", async (req, res) => {
  const { number, target, message } = req.body;
  const folder = `${authFolder}/${number}`;
  if (!fs.existsSync(folder)) return res.status(400).json({ error: "Not logged in" });

  const { state, saveCreds } = await useMultiFileAuthState(folder);
  const sock = makeWASocket({ auth: state });
  sock.ev.on("creds.update", saveCreds);

  try {
    await sock.sendMessage(target + "@s.whatsapp.net", { text: message });
    res.json({ status: "sent" });
  } catch (e) {
    res.status(500).json({ error: "Send failed", detail: e.message });
  }
});

app.listen(3001, () => console.log("🟢 Node server running on port 3001"));
