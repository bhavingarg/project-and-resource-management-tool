import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { systemConfigApiService } from '../../services/system-config.service';
import { SystemConfigEntryDto } from '../../models/system-config.dto';

const PROVIDER_DISPLAY: Record<string, string> = {
    gemini: 'Google Gemini',
    groq: 'Groq',
    custom: 'Custom (Ollama-compatible)',
};

const getValue = (entries: SystemConfigEntryDto[], key: string): string =>
    entries.find((e) => e.key === key)?.value ?? '(not set)';

const printCurrentSettings = (entries: SystemConfigEntryDto[]): void => {
    const provider = getValue(entries, 'llm_provider');
    const providerDisplay = PROVIDER_DISPLAY[provider] ?? provider;
    const apiKey = getValue(entries, 'llm_api_key');
    const host = getValue(entries, 'llm_host');
    const schedulerHours = getValue(entries, 'scheduler_interval_hours');
    const maxHours = getValue(entries, 'max_weekly_hours');

    console.log('\nCurrent Settings:');
    console.log(`  LLM Provider        :  ${providerDisplay}`);
    console.log(`  LLM Model           :  ${getValue(entries, 'llm_model')}`);
    console.log(`  LLM API Key         :  ${apiKey}`);
    if (provider === 'custom') {
        console.log(`  LLM Host            :  ${host || '(not set — using CUSTOM_LLM_HOST from .env)'}`);
    }
    console.log(`  Scheduler Interval  :  ${schedulerHours} hours`);
    console.log(`  Max Weekly Hours    :  ${maxHours}`);
};

export const SystemConfigScreen = {
    async show(): Promise<void> {
        while (true) {
            display.header('SYSTEM CONFIGURATION');

            let entries: SystemConfigEntryDto[];
            try {
                entries = await systemConfigApiService.getAll();
            } catch (error) {
                console.log(`\n  Error: ${extractErrorMessage(error)}`);
                await prompt('\n  Press Enter to continue');
                return;
            }

            printCurrentSettings(entries);

            console.log('\n──────────────────────────────────────────────');
            console.log('1. Update LLM API Key');
            console.log('2. Change LLM Provider  (Gemini / Groq / Custom)');
            console.log('3. Update LLM Host URL  (for Custom provider)');
            console.log('4. Update Scheduler Interval');
            console.log('5. Update Max Weekly Hours');
            console.log('6. Back\n');

            const option = (await prompt('Enter option')).trim();

            try {
                if (option === '1') {
                    const currentKey = getValue(entries, 'llm_api_key');
                    const isSet = currentKey !== '(not set)' && currentKey.length > 0;
                    console.log(`\n  Current API Key : ${isSet ? currentKey : '(none — using .env fallback)'}`);
                    console.log('  [1] Set / Update API key');
                    console.log('  [2] Clear API key  (revert to .env fallback)');
                    console.log('  [3] Cancel');
                    const subChoice = (await prompt('\n  Select')).trim();

                    if (subChoice === '1') {
                        const newKey = (await prompt('  Enter new API key')).trim();
                        if (!newKey) { console.log('  Cancelled.'); continue; }
                        await systemConfigApiService.update('llm_api_key', newKey);
                        console.log('\n  API key updated. ✓');
                    } else if (subChoice === '2') {
                        await systemConfigApiService.update('llm_api_key', '');
                        console.log('\n  API key cleared. Server will use GEMINI_API_KEY from .env as fallback. ✓');
                    } else {
                        console.log('  Cancelled.');
                        continue;
                    }
                    await prompt('\n  Press Enter to continue');

                } else if (option === '2') {
                    const current = getValue(entries, 'llm_provider');
                    const currentDisplay = PROVIDER_DISPLAY[current] ?? current;
                    console.log(`\n  Current provider: ${currentDisplay}`);
                    console.log('  [1] Google Gemini');
                    console.log('  [2] Groq');
                    console.log('  [3] Custom (Ollama-compatible)');
                    const provChoice = (await prompt('\n  Select provider')).trim();
                    let newProvider: string;
                    let defaultModel: string;
                    if (provChoice === '1') { newProvider = 'gemini'; defaultModel = 'gemini-1.5-flash'; }
                    else if (provChoice === '2') { newProvider = 'groq'; defaultModel = 'llama3-8b-8192'; }
                    else if (provChoice === '3') { newProvider = 'custom'; defaultModel = 'gemma'; }
                    else { console.log('  Invalid selection.'); continue; }

                    await systemConfigApiService.update('llm_provider', newProvider);

                    // Suggest a sensible default model for the new provider
                    console.log(`\n  Provider changed to ${PROVIDER_DISPLAY[newProvider]}.`);
                    console.log(`  Suggested default model: ${defaultModel}`);
                    const updateModel = (await prompt('  Update model to suggested default? [Y/N]')).trim().toUpperCase();
                    if (updateModel === 'Y') {
                        await systemConfigApiService.update('llm_model', defaultModel);
                        console.log(`  Model set to ${defaultModel}. ✓`);
                    }
                    console.log('  Provider updated. ✓');
                    await prompt('\n  Press Enter to continue');

                } else if (option === '3') {
                    const current = getValue(entries, 'llm_host');
                    console.log(`\n  Current LLM Host: ${current || '(not set — using CUSTOM_LLM_HOST from .env)'}`);
                    const newHost = (await prompt('  Enter new host URL (e.g. http://host/api/generate)')).trim();
                    if (!newHost) { console.log('  Cancelled.'); continue; }
                    await systemConfigApiService.update('llm_host', newHost);
                    console.log('\n  LLM Host updated. ✓');
                    await prompt('\n  Press Enter to continue');

                } else if (option === '4') {
                    const current = getValue(entries, 'scheduler_interval_hours');
                    console.log(`\n  Current scheduler interval: ${current} hours`);
                    const newVal = (await prompt('  Enter new interval in hours (e.g. 4)')).trim();
                    const parsed = Number(newVal);
                    if (!newVal || Number.isNaN(parsed) || parsed < 1 || parsed > 24) {
                        console.log('  Must be a number between 1 and 24.');
                        continue;
                    }
                    await systemConfigApiService.update('scheduler_interval_hours', String(parsed));
                    console.log(`\n  Scheduler interval updated to ${parsed} hours. ✓`);
                    console.log('  Note: restart the server to apply the new interval.');
                    await prompt('\n  Press Enter to continue');

                } else if (option === '5') {
                    const current = getValue(entries, 'max_weekly_hours');
                    console.log(`\n  Current max weekly hours: ${current}`);
                    const newVal = (await prompt('  Enter new max weekly hours (e.g. 40)')).trim();
                    const parsed = Number(newVal);
                    if (!newVal || Number.isNaN(parsed) || parsed < 1 || parsed > 168) {
                        console.log('  Must be a number between 1 and 168.');
                        continue;
                    }
                    await systemConfigApiService.update('max_weekly_hours', String(parsed));
                    console.log(`\n  Max weekly hours updated to ${parsed}. ✓`);
                    await prompt('\n  Press Enter to continue');

                } else if (option === '6') {
                    return;
                } else {
                    console.log('  Invalid option.');
                }
            } catch (error) {
                console.log(`\n  Error: ${extractErrorMessage(error)}`);
                await prompt('\n  Press Enter to continue');
            }
        }
    },
};

