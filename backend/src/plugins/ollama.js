import fp from "fastify-plugin";
import { ollamaEmbed, ollamaGenerate, ollamaStream } from "../lib/ollama-client.js";

export const ollamaPlugin = fp(
  async (fastify) => {
    fastify.decorate("ollama", {
      chat: ollamaGenerate,
      chatStream: ollamaStream,
      embed: ollamaEmbed
    });
  },
  { name: "ollama" }
);
