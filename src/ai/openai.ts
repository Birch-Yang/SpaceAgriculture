const API_URL = "https://api.openai.com/v1/responses";

export async function structuredResponse(name: string, schema: object, instructions: string, input: unknown,
  options: { maxOutputTokens?: number; timeoutMs?: number } = {}): Promise<unknown> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
  try {
    const response = await fetch(API_URL, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ model: "gpt-4o-mini", instructions, input: JSON.stringify(input), max_output_tokens: options.maxOutputTokens ?? 1200,
        text: { format: { type: "json_schema", name, strict: true, schema } } }),
    });
    if (!response.ok) return undefined;
    const payload = await response.json() as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
    const text = payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    return text ? JSON.parse(text) as unknown : undefined;
  } catch { return undefined; }
  finally { clearTimeout(timeout); }
}
