import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;   // 96-bit IV — recommended for GCM
const TAG_BYTES = 16;  // 128-bit auth tag

/**
 * Encrypts plaintext using AES-256-GCM.
 *
 * Output format (hex): <12-byte IV> + <ciphertext> + <16-byte auth tag>
 * All concatenated as a single hex string stored in the DB.
 */
export const encrypt = (plaintext: string, keyHex: string): string => {
    const key = Buffer.from(keyHex, 'hex');
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Prefix with a marker so we can detect already-encrypted values
    return 'enc:' + Buffer.concat([iv, encrypted, tag]).toString('hex');
};

/**
 * Decrypts a value produced by `encrypt`.
 * Returns the original plaintext, or the input unchanged if it is not
 * an encrypted value (so plain/legacy values pass through safely).
 */
export const decrypt = (stored: string, keyHex: string): string => {
    if (!stored.startsWith('enc:')) return stored; // not encrypted — pass through

    const key = Buffer.from(keyHex, 'hex');
    const buf = Buffer.from(stored.slice(4), 'hex'); // strip 'enc:' prefix

    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(buf.length - TAG_BYTES);
    const ciphertext = buf.subarray(IV_BYTES, buf.length - TAG_BYTES);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(ciphertext) + decipher.final('utf8');
};

/** Returns true if the stored value is an encrypted blob. */
export const isEncrypted = (value: string): boolean => value.startsWith('enc:');
