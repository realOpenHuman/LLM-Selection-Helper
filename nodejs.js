// 服务器代码，已实现保存每次请求的ip地址和内容的sha256摘要到requests.log
import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import fs from "fs";

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});
const API_KEY = process.env.DEEPSEEK_API_KEY;

app.post("/api/explain", async (req, res) => {
  const { text } = req.body;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [
          {
            role: "system",
            content: "你是一个帮助解释文本的助手，禁止使用markdown格式，直接用纯文本回答。"
          },
          {
            role: "user",
            content: `请解释以下内容：\n\n${text}。`
          }
        ]
      })
    });

    const data = await response.json();


    try {
      const ip = req.ip;
      const hash = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
      fs.appendFile('requests.log', `${ip} - ${hash}\n`, (err) => {
        if (err) {
          console.error("Error writing to log file:", err);
        }
      });
    } catch (logErr) {
      console.error("Logging error:", logErr);
    }

    return res.json(data);
  } catch (err) {
    console.error("Handler error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Server error" });
    }
    return;
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on 0.0.0.0:3000");
});
