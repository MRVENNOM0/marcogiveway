import express from "express";
import path from "path";
// import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Helper for Discord Posting using native fetch
async function postToDiscord(webhookUrl: string, data: any) {
  console.log(`Attempting to post to Discord: ${webhookUrl.substring(0, 50)}...`);
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Discord rejected the request: ${response.status} ${response.statusText}`, text);
    throw new Error(`Discord API error: ${response.status} ${text}`);
  }
  
  console.log("Discord notification successful");
  return true;
}

const router = express.Router();

router.get("/ping", (req, res) => {
  res.json({ 
    status: "alive", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL
  });
});

router.post("/discord-notify", async (req, res) => {
  const { discordUsername, giveawayTitle } = req.body;
  const webhookUrl = process.env.JOIN_WEBHOOK_URL || "https://discord.com/api/webhooks/1505950917386572008/PTkTV3WaeAUOvse2bmdin8_bcFEbDXlSAZ0k4LabmIrRnPns6DoioMd64xuhw66eHExZ";

  try {
    await postToDiscord(webhookUrl, {
      embeds: [
        {
          title: "🎯 New Campaign Entry",
          color: 0xffa500,
          description: `A user has successfully joined the giveaway via the custom link.`,
          fields: [
            { name: "👤 User Name / ID", value: discordUsername || "Anonymous", inline: true },
            { name: "🎁 Giveaway", value: giveawayTitle || "Unknown", inline: true },
            { name: "⏰ Timestamp", value: new Date().toLocaleString(), inline: false }
          ],
          footer: { text: "MARCOXITERS GIVEWAY • System Notification" },
          timestamp: new Date().toISOString()
        }
      ]
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Discord notification failed", message: error.message });
  }
});

router.post("/announce-winner", async (req, res) => {
  const { giveawayTitle, winnerName, winnerId } = req.body;
  const webhookUrl = process.env.WINNER_WEBHOOK_URL || "https://discord.com/api/webhooks/1506244762393645147/amgM0OEXq36p2BZDdrSTLSILvOncCMkNXHV5RbvGzoTCOQZ2DC9lfdmg71Z5B9tZI0ao";

  try {
    await postToDiscord(webhookUrl, {
      content: "@everyone",
      embeds: [
        {
          title: "🏆 GIVEAWAY WINNER ANNOUNCED! 🏆",
          color: 0xffa500,
          description: `We have a winner for **${giveawayTitle}**!`,
          fields: [
            { name: "👑 Winner", value: `**${winnerName}**`, inline: true },
            { name: "🆔 User ID", value: winnerId || "N/A", inline: true }
          ],
          footer: { text: "MARCOXITERS GIVEWAY • Congratulations!" },
          thumbnail: { url: "https://cdn-icons-png.flaticon.com/512/3112/3112946.png" },
          timestamp: new Date().toISOString()
        }
      ]
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Winner announcement failed", message: error.message });
  }
});

router.post("/announce-giveaway", async (req, res) => {
  const { title, endsAt, imageUrl } = req.body;
  const webhookUrl = process.env.WINNER_WEBHOOK_URL || "https://discord.com/api/webhooks/1506244762393645147/amgM0OEXq36p2BZDdrSTLSILvOncCMkNXHV5RbvGzoTCOQZ2DC9lfdmg71Z5B9tZI0ao";

  try {
    await postToDiscord(webhookUrl, {
      content: "🔥 **NEW GIVEAWAY ADDED JOIN NOW** 🔥",
      embeds: [
        {
          title: `${title}`,
          color: 0x3B82F6,
          fields: [
            { name: "Ends At", value: new Date(endsAt).toLocaleString(), inline: true },
            { name: "Status", value: "🟢 LIVE", inline: true }
          ],
          image: imageUrl ? { url: imageUrl } : undefined,
          footer: { text: "MARCOXITERS GIVEWAY" },
          timestamp: new Date().toISOString()
        }
      ]
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Giveaway announcement failed", message: error.message });
  }
});

// Apply router to /api and /
app.use("/api", router);
app.use("/", router);

// Setup logic for development and production (non-Vercel)
async function setupServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not in a Vercel environment
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

setupServer().catch(err => {
  console.error("Server setup error:", err);
});

export default app;
