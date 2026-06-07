import * as readline from 'readline';
import { Writable } from 'stream';

const isInteractive = Boolean(process.stdin.isTTY);

let outputMuted = false;
const maskedOutput = new Writable({
    write(chunk, _encoding, callback) {
        if (!outputMuted) {
            process.stdout.write(chunk);
        }
        callback();
    },
});

const rl = readline.createInterface({
    input: process.stdin,
    output: maskedOutput,
    terminal: isInteractive,
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
