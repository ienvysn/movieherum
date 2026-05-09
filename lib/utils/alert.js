export async function sendAlert(message) {
  console.error("🚨 ALERT:", message);
  
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
  if (discordWebhook) {
    try {
      await fetch(discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `🚨 **Scraper Alert** 🚨\n${message}` }),
      });
    } catch (e) {
      console.error("Failed to send Discord alert:", e);
    }
  }

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  if (telegramBotToken && telegramChatId) {
    try {
      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: `🚨 *Scraper Alert* 🚨\n${message}`,
          parse_mode: "Markdown"
        }),
      });
    } catch (e) {
      console.error("Failed to send Telegram alert:", e);
    }
  }
}
