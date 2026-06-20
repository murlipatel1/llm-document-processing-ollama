import { env } from "../../config/env.js";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
  "shall", "can", "need", "this", "that", "these", "those", "it", "its", "they", "them",
  "their", "we", "our", "you", "your", "he", "she", "his", "her", "not", "no", "also",
  "into", "through", "during", "before", "after", "above", "below", "between", "under",
  "over", "again", "further", "then", "once", "here", "there", "when", "where", "why",
  "how", "all", "each", "few", "more", "most", "other", "some", "such", "only", "own",
  "same", "so", "than", "too", "very", "just", "about", "any", "both", "each", "which",
  "who", "whom", "what", "while", "if", "because", "until", "although", "though",
  "however", "therefore", "thus", "via", "per", "using", "used", "use", "within",
  "without", "across", "including", "include", "includes", "included", "provide",
  "provides", "provided", "following", "document", "section", "page", "pages", "file"
]);

function collectionName(tenantId) {
  return `tenant_${tenantId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function topicSlug(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function qdrantRequest(path, options = {}) {
  const response = await fetch(`${env.QDRANT_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Qdrant error (${response.status}): ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function scrollDocumentChunks(collName, documentId, maxChunks = 4) {
  const chunks = [];
  let offset = null;

  do {
    const body = {
      filter: { must: [{ key: "documentId", match: { value: documentId } }] },
      with_vectors: false,
      with_payload: true,
      limit: 50
    };
    if (offset !== null) body.offset = offset;

    const res = await qdrantRequest(`/collections/${collName}/points/scroll`, {
      method: "POST",
      body: JSON.stringify(body)
    });

    for (const point of res?.result?.points ?? []) {
      const text = point.payload?.chunkText || "";
      const chunkIndex = point.payload?.chunkIndex ?? chunks.length;
      if (text.trim()) {
        chunks.push({ text: text.trim(), chunkIndex });
      }
    }

    offset = res?.result?.next_page_offset ?? null;
  } while (offset !== null && chunks.length < maxChunks * 3);

  chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  return pickRepresentativeChunks(chunks, maxChunks);
}

function pickRepresentativeChunks(chunks, maxChunks) {
  if (!chunks.length) return [];
  if (chunks.length <= maxChunks) return chunks;

  const picked = [chunks[0]];
  if (maxChunks >= 2) {
    picked.push(chunks[Math.floor(chunks.length / 2)]);
  }
  if (maxChunks >= 3 && chunks.length > 2) {
    picked.push(chunks[chunks.length - 1]);
  }
  if (maxChunks >= 4) {
    const remaining = chunks.filter((c) => !picked.includes(c));
    const longest = remaining.sort((a, b) => b.text.length - a.text.length)[0];
    if (longest) picked.push(longest);
  }

  return picked.slice(0, maxChunks);
}

function extractPhrases(text) {
  const phrases = new Set();

  const multiWord = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
  for (const p of multiWord) phrases.add(p.trim());

  const acronyms = text.match(/\b[A-Z]{2,8}\b/g) || [];
  for (const a of acronyms) phrases.add(a);

  return [...phrases];
}

function extractKeywords(text, maxTerms = 10) {
  const terms = new Map();
  const words = text.toLowerCase().match(/\b[a-z][a-z0-9-]{2,}\b/g) || [];

  for (const word of words) {
    if (STOPWORDS.has(word) || word.length < 3) continue;
    terms.set(word, (terms.get(word) || 0) + 1);
  }

  return [...terms.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([word]) => word);
}

function titleCase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function buildTopicIndex(docProfiles) {
  const index = new Map();

  const addTerm = (rawTerm, documentId) => {
    const label = rawTerm.trim();
    if (!label || label.length < 2) return;
    const key = label.toLowerCase();
    if (STOPWORDS.has(key)) return;

    if (!index.has(key)) {
      index.set(key, { label, docIds: new Set(), count: 0 });
    }
    const entry = index.get(key);
    entry.docIds.add(documentId);
    entry.count += 1;
    if (label.length > entry.label.length) entry.label = label;
  };

  for (const profile of docProfiles) {
    const seenInDoc = new Set();
    for (const phrase of profile.phrases) {
      const key = phrase.toLowerCase();
      if (!seenInDoc.has(key)) {
        seenInDoc.add(key);
        addTerm(phrase, profile.id);
      }
    }
    for (const kw of profile.keywords) {
      const key = kw.toLowerCase();
      if (!seenInDoc.has(key)) {
        seenInDoc.add(key);
        addTerm(titleCase(kw), profile.id);
      }
    }
  }

  return index;
}

function truncateLabel(text, max = 48) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export async function buildDocumentGraph(fastify, tenantId, { threshold = 0.6, maxNodes = 50 } = {}) {
  const documents = await fastify.prisma.document.findMany({
    where: { tenantId, status: "READY" },
    orderBy: { createdAt: "desc" },
    take: maxNodes
  });

  if (!documents.length) {
    return { nodes: [], edges: [], stats: { documents: 0, topics: 0, chunks: 0, edges: 0 } };
  }

  const collName = collectionName(tenantId);
  let qdrantAvailable = true;
  try {
    await qdrantRequest(`/collections/${collName}`);
  } catch {
    qdrantAvailable = false;
  }

  const BATCH_SIZE = 5;
  const docProfiles = [];

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (doc) => {
        const corpusText = [doc.summary || "", doc.filename || ""].join(" ");
        let chunks = [];

        if (qdrantAvailable) {
          try {
            chunks = await scrollDocumentChunks(collName, doc.id, 2);
          } catch {
            chunks = [];
          }
        }

        const chunkTexts = chunks.map((c) => c.text).join(" ");
        const fullText = `${corpusText} ${chunkTexts}`;
        const phrases = extractPhrases(fullText);
        const keywords = extractKeywords(fullText, 8);

        return {
          id: doc.id,
          doc,
          chunks,
          phrases,
          keywords
        };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        docProfiles.push(result.value);
      }
    }
  }

  const nodes = [];
  const edges = [];
  const topicIndex = buildTopicIndex(docProfiles);

  // Document nodes
  for (const profile of docProfiles) {
    const doc = profile.doc;
    nodes.push({
      id: `doc:${doc.id}`,
      type: "document",
      label: doc.filename,
      filename: doc.filename,
      chunkCount: doc.chunkCount || 0,
      summary: doc.summary ?? null,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt,
      val: Math.max(8, (doc.chunkCount || 1) * 2)
    });
  }

  // Chunk nodes + contains edges
  for (const profile of docProfiles) {
    for (const chunk of profile.chunks) {
      const chunkId = `chunk:${profile.id}:${chunk.chunkIndex}`;
      nodes.push({
        id: chunkId,
        type: "chunk",
        label: truncateLabel(chunk.text, 56),
        chunkText: chunk.text,
        documentId: profile.id,
        parentFilename: profile.doc.filename,
        chunkIndex: chunk.chunkIndex,
        val: 3
      });

      edges.push({
        source: `doc:${profile.id}`,
        target: chunkId,
        type: "contains",
        weight: 1
      });
    }
  }

  // Topic nodes + capped mentions edges (max 6 topics per document)
  const docMentionCounts = new Map();

  for (const profile of docProfiles) {
    const seen = new Set();
    const candidates = [];

    for (const phrase of profile.phrases) {
      const key = phrase.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = topicIndex.get(key);
      if (entry) candidates.push({ key, label: entry.label, score: entry.count + 2 });
    }
    for (const kw of profile.keywords) {
      const key = kw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = topicIndex.get(key);
      if (entry) candidates.push({ key, label: titleCase(kw), score: entry.count });
    }

    candidates.sort((a, b) => b.score - a.score);
    for (const c of candidates.slice(0, 6)) {
      docMentionCounts.set(`${profile.id}|${c.key}`, { docId: profile.id, ...c });
    }
  }

  for (const { docId, key, label } of docMentionCounts.values()) {
    const topicId = `topic:${topicSlug(label)}`;
    const entry = topicIndex.get(key);

    if (!nodes.some((n) => n.id === topicId)) {
      nodes.push({
        id: topicId,
        type: "topic",
        label,
        docCount: entry?.docIds.size ?? 1,
        val: Math.max(3, (entry?.docIds.size ?? 1) * 2)
      });
    }

    const src = `doc:${docId}`;
    if (!edges.some((e) => e.source === src && e.target === topicId && e.type === "mentions")) {
      edges.push({ source: src, target: topicId, type: "mentions", weight: 0.8 });
    }
  }

  const stats = {
    documents: nodes.filter((n) => n.type === "document").length,
    topics: nodes.filter((n) => n.type === "topic").length,
    chunks: nodes.filter((n) => n.type === "chunk").length,
    edges: edges.length
  };

  return { nodes, edges, stats };
}
