import { createAiService } from '../services/ai.service';

jest.mock('@google/generative-ai', () => {
    const generateContent = jest.fn().mockResolvedValue({
        response: { text: () => ' gemini response ' },
    });
    const getGenerativeModel = jest.fn().mockReturnValue({ generateContent });
    return { GoogleGenerativeAI: jest.fn().mockImplementation(() => ({ getGenerativeModel })) };
});

jest.mock('groq-sdk', () => {
    const create = jest.fn().mockResolvedValue({
        choices: [{ message: { content: ' groq response ' } }],
    });
    const MockGroq = jest.fn().mockImplementation(() => ({
        chat: { completions: { create } },
    }));
    return { __esModule: true, default: MockGroq };
});

describe('AiService', () => {
    const service = createAiService();

    it('calls Gemini and returns trimmed text', async () => {
        const result = await service.generateText('hello', 'gemini', 'gemini-1.5-flash', 'key');
        expect(result).toBe('gemini response');
    });

    it('calls Groq and returns trimmed text', async () => {
        const result = await service.generateText('hello', 'groq', 'llama3-8b-8192', 'key');
        expect(result).toBe('groq response');
    });

    it('handles empty Groq choices gracefully', async () => {
        const { default: MockGroq } = require('groq-sdk');
        MockGroq.mockImplementationOnce(() => ({
            chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [] }) } },
        }));
        const result = await service.generateText('hello', 'groq', 'llama3-8b-8192', 'key');
        expect(result).toBe('');
    });
});
