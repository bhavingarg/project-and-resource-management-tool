import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
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

        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        let input = '';

        const onData = (char: string): void => {
            if (char === '\r' || char === '\n') {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener('data', onData);
                process.stdout.write('\n');
                resolve(input);
            } else if (char === '\u0003') {
                process.exit();
            } else if (char === '\u007f') {
                if (input.length > 0) {
                    input = input.slice(0, -1);
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                    process.stdout.write(`${question}: ${'*'.repeat(input.length)}`);
                }
            } else {
                input += char;
                process.stdout.write('*');
            }
        };

        process.stdin.on('data', onData);
    });
};

export const closeInput = (): void => {
    rl.close();
};
