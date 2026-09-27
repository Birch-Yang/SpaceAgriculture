export const QUESTIONS_PER_TURN = 2;

export const openingMessage = `Lunar Agriculture Base Manager, this is Photon, your Earthside liaison. Our Moon-to-Earth relay is weak, so I can answer only ${QUESTIONS_PER_TURN} questions per mission turn. I receive only fragments of your telemetry. Ask me for a hint when you need one; the decisions remain yours. If the signal drops, use your local instruments until we reconnect.`;

export const questionLimitMessage = "Photon relay: signal quality is too poor for another answer this turn. I can take two questions per mission turn. Check your local instruments and try again after the next turn.";

export const linkRestoredMessage = "Photon relay: contact restored. We lost some telemetry during the outage; check your local incident log before making your next decision.";

export function normalizeIMessagePhone(input: string): string | undefined {
  const trimmed = input.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed)) return undefined;
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && /^[1-9]\d{6,14}$/.test(digits)) return `+${digits}`;
  if (!trimmed.startsWith("+") && /^\d{10}$/.test(digits)) return `+1${digits}`;
  if (!trimmed.startsWith("+") && /^1\d{10}$/.test(digits)) return `+${digits}`;
  return undefined;
}

type Inbound = { event?: unknown; space?: { id?: unknown; platform?: unknown; type?: unknown }; message?: { id?: unknown; platform?: unknown; direction?: unknown; content?: { type?: unknown; text?: unknown } } };
const isIMessage = (platform: unknown) => platform === "imessage" || platform === "iMessage";

export function parseInboundQuestion(value: unknown): { spaceId: string; messageId: string; text: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const payload = value as Inbound;
  if (payload.event !== "messages" || !isIMessage(payload.space?.platform) || payload.space?.type !== "dm"
    || payload.message?.direction !== "inbound" || !isIMessage(payload.message.platform)
    || payload.message.content?.type !== "text" || typeof payload.message.content.text !== "string"
    || !payload.message.content.text.trim() || payload.message.content.text.length > 500
    || typeof payload.message.id !== "string" || typeof payload.space?.id !== "string") return undefined;
  return { spaceId: payload.space.id, messageId: payload.message.id, text: payload.message.content.text.trim() };
}
