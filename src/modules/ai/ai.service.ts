import { env } from "../../config/env";

export class AIService {
  async ask(question: string, context: Record<string, unknown>) {
    if (!env.AI_ENABLED || !env.AI_BASE_URL) {
      return null;
    }
    try {
      const response = await fetch(`${env.AI_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.AI_MODEL,
          stream: false,
          options: {
            num_ctx: 4096
          },
          messages: [
            {
              role: "system",
              content: "Você é um atendente de vendas em português do Brasil. Responda de forma direta em no máximo 2 frases curtas. Não repita catálogo inteiro, não use introduções longas e não faça perguntas múltiplas na mesma resposta. Foque em próximo passo objetivo de compra."
            },
            {
              role: "user",
              content: `Pergunta do cliente: ${question}\n\nContexto em JSON:\n${JSON.stringify(context)}`
            }
          ]
        })
      });

      if (!response.ok) {
        return null;
      }

      const body = await response.json() as { message?: { content?: string } };
      return body.message?.content?.trim() ?? null;
    } catch {
      return null;
    }
  }
}
