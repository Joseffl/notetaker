const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models";
const chatModel = process.env.HF_CHAT_MODEL || "meta-llama/Llama-3.1-8B-Instruct";
const embeddingModel =
  process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";

function getHeaders() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not set");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function callHuggingFace<T>(
  model: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${HUGGINGFACE_API_URL}/${model}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Hugging Face request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

function normalizeEmbedding(data: unknown): number[] {
  if (
    Array.isArray(data) &&
    data.every((value) => typeof value === "number")
  ) {
    return data as number[];
  }

  if (
    Array.isArray(data) &&
    data.length > 0 &&
    Array.isArray(data[0]) &&
    data[0].every((value) => typeof value === "number")
  ) {
    return data[0] as number[];
  }

  throw new Error("Unexpected embedding response shape from Hugging Face");
}

export async function createEmbedding(text: string) {
  const response = await callHuggingFace<unknown>(embeddingModel, {
    inputs: text,
    options: { wait_for_model: true },
  });

  return normalizeEmbedding(response);
}

export async function createManyEmbeddings(texts: string[]) {
  return Promise.all(texts.map((text) => createEmbedding(text)));
}

function buildPrompt(systemPrompt: string, userQuestion: string) {
  return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
${systemPrompt}
<|eot_id|><|start_header_id|>user<|end_header_id|>
${userQuestion}
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;
}

function extractGeneratedText(response: unknown) {
  if (
    Array.isArray(response) &&
    response.length > 0 &&
    typeof response[0] === "object" &&
    response[0] !== null &&
    "generated_text" in response[0] &&
    typeof response[0].generated_text === "string"
  ) {
    return response[0].generated_text;
  }

  if (
    typeof response === "object" &&
    response !== null &&
    "generated_text" in response &&
    typeof response.generated_text === "string"
  ) {
    return response.generated_text;
  }

  throw new Error("Unexpected text generation response shape from Hugging Face");
}

export async function chatWithAI(systemPrompt: string, userQuestion: string) {
  const response = await callHuggingFace<unknown>(chatModel, {
    inputs: buildPrompt(systemPrompt, userQuestion),
    parameters: {
      max_new_tokens: 500,
      temperature: 0.7,
      return_full_text: false,
    },
    options: { wait_for_model: true },
  });

  return extractGeneratedText(response).trim() || "sorry, I could not generate a response.";
}

export async function generateStructuredJson(
  systemPrompt: string,
  userPrompt: string,
) {
  const response = await callHuggingFace<unknown>(chatModel, {
    inputs: buildPrompt(systemPrompt, userPrompt),
    parameters: {
      max_new_tokens: 1000,
      temperature: 0.2,
      return_full_text: false,
    },
    options: { wait_for_model: true },
  });

  return extractGeneratedText(response).trim();
}
