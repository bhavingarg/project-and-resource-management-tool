import * as readline from 'readline';
import { Writable } from 'stream';

let outputMuted = false;

// Custom output stream — when muted, swallows keystrokes so passwords are invisible
const maskedOutput = new Writable({
    write(chunk, _encoding, callback) {
        if (!outputMuted) process.stdout.write(chunk);
        callback();
    },
});

// Single readline instance shared across the whole app
const rl = readline.createInterface({
    input: process.stdin,
    output: maskedOutput,
    terminal: true,   // always treat as interactive so masking works
});

export const prompt = (question: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(`${question}: `, (answer) => {
            resolve(answer.trim());
        });
    });
};

export const promptHidden = (question: string): Promise<string> => {
    return new Promise((resolve) => {
        process.stdout.write(`${question}: `);
        outputMuted = true;

        rl.question('', (answer) => {
            outputMuted = false;
            process.stdout.write('\n');
            resolve(answer.trim());
        });
    });
};

export const closeInput = (): void => {
    rl.close();
};
