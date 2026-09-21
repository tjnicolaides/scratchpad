import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PORT = process.env.PORT || 8080;

if (!AUTH_TOKEN) throw new Error("MCP_AUTH_TOKEN env var required");
if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY env var required");

const MODELS = {
  flash: "deepseek/deepseek-v4-flash",
  pro: "deepseek/deepseek-v4-pro",
  qwen: "qwen/qwen3.6-plus",
  owl: "openrouter/owl-alpha",
};

async function callOpenRouter(model, prompt, systemPrompt) {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "(empty response)";
}

function buildServer() {
  const server = new McpServer({ name: "openrouter-mcp", version: "1.0.0" });

  server.registerTool(
    "ask_model",
    {
      title: "Ask an OpenRouter model",
      description:
        "Send a prompt to a cheap non-Anthropic model via OpenRouter. Use for mechanical subtasks (summarizing, search-and-report, boilerplate, simple rewrites) to save Claude usage. Not for tasks needing careful multi-step reasoning.",
      inputSchema: {
        prompt: z.string().describe("The task/question to send to the model"),
        model: z
          .enum(["flash", "pro", "qwen", "owl"])
          .default("flash")
          .describe(
            "flash=deepseek-v4-flash (cheapest, default), pro=deepseek-v4-pro (stronger reasoning), qwen=qwen3.6-plus, owl=owl-alpha"
          ),
        system: z.string().optional().describe("Optional system prompt"),
      },
    },
    async ({ prompt, model, system }) => {
      try {
        const text = await callOpenRouter(MODELS[model], prompt, system);
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}

const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${AUTH_TOKEN}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
});

app.post("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(PORT, () => console.log(`openrouter-mcp listening on ${PORT}`));
