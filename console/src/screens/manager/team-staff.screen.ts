import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { aiApiService } from '../../services/ai.service';
import { TeamRoleDto, TeamRoleResultDto } from '../../models/ai.dto';

const LINE = '─'.repeat(55);

const wrapText = (text: string, indent: number): string => {
    const pad = ' '.repeat(indent);
    const width = 58;
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
        if (current.length + word.length + 1 > width && current.length > 0) {
            lines.push(current);
            current = word;
        } else {
            current = current.length > 0 ? `${current} ${word}` : word;
        }
    }
    if (current.length > 0) lines.push(current);
    return lines.join(`\n${pad}`);
};

const printResults = (results: TeamRoleResultDto[], projectName?: string): void => {
    console.log(`\n  ┌─────────────────────────────────────────────────────┐`);
    console.log(`  │              Team Staffing Results                  │`);
    if (projectName) {
        const padded = `Project: ${projectName}`.padEnd(51);
        console.log(`  │  ${padded}│`);
    }
    console.log(`  └─────────────────────────────────────────────────────┘`);

    const matched = results.filter((r) => r.matched);
    const gaps = results.filter((r) => !r.matched);

    matched.forEach((r) => {
        const candidates = r.candidates ?? [];
        console.log(`\n  ── ${r.roleName}  (${r.requiredSkill})  ──`);
        if (candidates.length === 0) {
            console.log(`     No matching candidates found.`);
            return;
        }
        candidates.forEach((c, i) => {
            const availBar = '█'.repeat(Math.round(c.freePercent / 10)) +
                '░'.repeat(10 - Math.round(c.freePercent / 10));
            console.log(`\n  ${i + 1}. ${c.fullName}`);
            console.log(`     Availability : ${availBar} ${c.freePercent}% free`);
            console.log(`     Manager      : ${c.currentManager ?? '(unassigned)'}`);
            console.log(`     Skills       : ${wrapText(c.skills.length > 0 ? c.skills.join(', ') : '(none listed)', 20)}`);
            console.log(`     Reason       : ${wrapText(c.reason, 20)}`);
        });
        console.log(`  ${LINE}`);
    });

    if (gaps.length > 0) {
        console.log(`\n  ✗ SKILL GAPS (${gaps.length})`);
        console.log(`  ${LINE}`);
        gaps.forEach((r, i) => {
            const icon = r.gapType === 'no_skill' ? '⊘ No skill in org' : '⏳ All allocated';
            console.log(`\n  ${i + 1}. ${r.roleName}  [${icon}]`);
            console.log(`     Skill needed : ${r.requiredSkill}`);
            console.log(`     Why          : ${wrapText(r.gapMessage ?? '', 20)}`);
            if (r.gapType === 'all_allocated' && r.availableFrom) {
                console.log(`     Available by : ${r.availableFrom}`);
            }
        });
        console.log(`  ${LINE}`);
    }

    if (matched.length > 0) {
        console.log('\n  Note: Contact each resource\'s manager to arrange allocation.');
        console.log('        If they are not on your team, ask an admin to reassign.');
    }
};

export const TeamStaffScreen = {
    async show(): Promise<void> {
        display.header('AI Team Staffing');

        console.log('\n  Define each role your project needs, one at a time.');
        console.log('  The AI will rank all available resources for each role so you can choose.\n');

        const projectNameInput = (await prompt('  Project name (optional, press Enter to skip)')).trim();
        const projectName = projectNameInput || undefined;

        const roles: TeamRoleDto[] = [];

        while (true) {
            console.log(`\n  Role #${roles.length + 1}`);
            const roleName = (await prompt('  Role title (e.g. "Senior Java Developer", or Enter to finish)')).trim();
            if (!roleName) {
                if (roles.length === 0) {
                    console.log('  No roles defined. Returning.');
                    return;
                }
                break;
            }

            const requiredSkill = (await prompt('  Required skill (e.g. "Java", "React", "Salesforce")')).trim();
            if (!requiredSkill) {
                console.log('  Skill cannot be empty. Skipping this role.');
                continue;
            }

            const proficiencyLevel = (await prompt('  Proficiency level (optional, e.g. "Senior", press Enter to skip)')).trim();

            roles.push({
                roleName,
                requiredSkill,
                ...(proficiencyLevel ? { proficiencyLevel } : {}),
            });

            console.log(`  ✓ Added: ${roleName} (${requiredSkill})`);

            const addMore = (await prompt('\n  Add another role? [Y/N]')).trim().toUpperCase();
            if (addMore !== 'Y') break;
        }

        console.log(`\n  Staffing ${roles.length} role(s)...`);
        console.log(`  This may take up to ${roles.length * 30} seconds — the AI evaluates each role in sequence.`);
        console.log('  Please wait...\n');

        try {
            const result = await aiApiService.staffTeam(roles, projectName);
            printResults(result.results, result.projectName);
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
        }

        await prompt('\n  Press Enter to continue');
    },
};
