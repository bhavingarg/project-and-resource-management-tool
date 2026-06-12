import { encrypt, decrypt, isEncrypted } from '../utils/crypto.util';

const KEY = 'a'.repeat(64); // 32-byte key as 64-char hex

describe('crypto.util', () => {
    describe('encrypt / decrypt roundtrip', () => {
        it('decrypts to original value', () => {
            const original = 'my-secret-api-key-12345';
            const encrypted = encrypt(original, KEY);
            expect(decrypt(encrypted, KEY)).toBe(original);
        });

        it('produces different ciphertext each time (random IV)', () => {
            const text = 'same-input';
            const enc1 = encrypt(text, KEY);
            const enc2 = encrypt(text, KEY);
            expect(enc1).not.toBe(enc2);
        });

        it('encrypted value starts with enc: prefix', () => {
            expect(encrypt('hello', KEY)).toMatch(/^enc:/);
        });
    });

    describe('isEncrypted', () => {
        it('returns true for encrypted values', () => {
            expect(isEncrypted(encrypt('test', KEY))).toBe(true);
        });

        it('returns false for plain text', () => {
            expect(isEncrypted('plaintext-value')).toBe(false);
        });

        it('returns false for empty string', () => {
            expect(isEncrypted('')).toBe(false);
        });
    });

    describe('decrypt passthrough', () => {
        it('returns plain value unchanged when not encrypted', () => {
            expect(decrypt('plain-value', KEY)).toBe('plain-value');
        });

        it('returns empty string unchanged', () => {
            expect(decrypt('', KEY)).toBe('');
        });
    });
});
