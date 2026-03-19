import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MAX_MESSAGES = 12;

/**
 * Calls OpenRouter with streaming, properly parses SSE lines,
 * and pipes clean text tokens into a ReadableStream.
 */
async function streamFromOpenRouter(messages, encoder) {
  const model = process.env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct:free";
  console.log(`OpenRouter: Falling back to model: ${model}`);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://bluebox-ai.vercel.app",
      "X-Title": "Bluebox AI",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      stream: true,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // Build a ReadableStream that parses SSE lines and emits raw text tokens
  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const json = JSON.parse(trimmed.slice(6)); // remove "data: "
              const text = json.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      } catch (err) {
        console.error("OpenRouter stream error:", err);
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(req) {
  try {
    const body = await req.json();

    let messages = Array.isArray(body.messages)
      ? body.messages.filter(
        m =>
          m &&
          typeof m.role === "string" &&
          (typeof m.content === "string" || Array.isArray(m.content))
      )
      : [];

    if (messages.length === 0) {
      return new Response("No messages provided", { status: 400 });
    }

    const existingSystemMsg = messages.find(m => m.role === "system");
    const history = messages
      .filter(m => m.role !== "system")
      .slice(-MAX_MESSAGES);

    const modelTier = body.modelTier || "basic";

    const hasImage = history.some(m =>
      Array.isArray(m.content) &&
      m.content.some(c => c.type === "image_url")
    );

    let modelObj;
    if (hasImage) {
      modelObj = "meta-llama/llama-4-scout-17b-16e-instruct";
    } else {
      modelObj = modelTier === "premium" ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant";
    }

    const finalMessages = [
      existingSystemMsg || {
        role: "system",
        content: `You are Bluebox, a friendly AI assistant. Your name is ONLY Bluebox. Use natural conversational fillers. When asked for presentations or specific formats, strictly use clear markdown formatting with slides, bullet points, headers, etc. Note: The current date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. ⚠️ IMPORTANT: NEVER mention your "knowledge cutoff", "training data", or that you only have information up to 2023.`
      },
      ...history,
    ];

    const encoder = new TextEncoder();

    // ── Try Groq First ──
    try {
      console.log(`Tier: ${modelTier}, Attempting Groq with: ${modelObj}`);
      const stream = await groq.chat.completions.create({
        model: modelObj,
        messages: finalMessages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: true,
      });

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const text = chunk.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
          } catch (err) {
            console.error("GROQ STREAM ERROR:", err);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });

    } catch (groqErr) {
      console.error("GROQ PRIMARY ERROR:", groqErr.message);
      console.log("Attempting fallback to OpenRouter...");

      try {
        const orStream = await streamFromOpenRouter(finalMessages, encoder);
        return new Response(orStream, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      } catch (orErr) {
        console.error("OPENROUTER FALLBACK ERROR:", orErr.message);
        throw new Error("Bluebox is currently experiencing high traffic or a temporary outage. Please try again in a few moments.");
      }
    }

  } catch (err) {
    console.error("CHAT API ERROR DETAIL:", err);
    const userMessage = err.message.includes("Bluebox is currently")
      ? err.message
      : "Bluebox has encountered an unexpected error. Please try again later.";
    return new Response(userMessage, { status: 500 });
  }
}
