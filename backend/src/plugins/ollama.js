import fp from "fastify-plugin";
import { ollamaEmbed, ollamaGenerate } from "../lib/ollama-client.js";

export const ollamaPlugin = fp(
  async (fastify) => {
    fastify.decorate("ollama", {
      chat: ollamaGenerate,
      embed: ollamaEmbed
    });
  },
  { name: "ollama" }
);
