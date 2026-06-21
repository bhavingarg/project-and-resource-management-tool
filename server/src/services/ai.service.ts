import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

export type LlmProvider = 'gemini' | 'groq' | 'custom';

export interface IAiService {
    /**
     * Send a plain-text prompt to the configured LLM and receive a plain-text response.
     *
     * IMPORTANT — data isolation: this method only ever sends and receives
     * plain strings.  The LLM has no database connection, no ORM access, and
     * no SQL capability.  All data must be pre-fetched by the repository layer
     * and embedded in the prompt by the caller before this method is invoked.
     */
    generateText(prompt: string, provider: LlmProvider, modelName: string, apiKey: string, host?: string): Promise<string>;
}

export const createAiService = (): IAiService => ({
    async generateText(
        prompt: string,
        provider: LlmProvider,
        modelName: string,
        apiKey: string,
        host?: string,
    ): Promise<string> {
        if (provider === 'groq') {
            const groq = new Groq({ apiKey });
            const completion = await groq.chat.completions.create({
                model: modelName,
                messages: [{ role: 'user', content: prompt }],
            });
            return (completion.choices[0]?.message?.content ?? '').trim();
        }

        if (provider === 'custom') {
            if (!host) throw new Error('custom LLM provider requires llm_host to be configured in System Config');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (apiKey) headers['apikey'] = apiKey;
            const response = await fetch(host, {
                method: 'POST',
                headers,
                body: JSON.stringify({ model: modelName, prompt, stream: false }),
            });
            if (!response.ok) {
                throw new Error(`Custom LLM request failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json() as { response?: string };
            return (data.response ?? '').trim();
        }

        // Default: Gemini
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    },
});
