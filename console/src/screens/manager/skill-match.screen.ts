import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { managerApiService } from '../../services/manager.service';
import { aiApiService } from '../../services/ai.service';
import { SkillMatchResultDto } from '../../models/ai.dto';
import { ManagerProjectDto } from '../../models/manager.dto';

const wrapReason = (text: string): string => {
    const indent = ' '.repeat(20);
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
    return lines.join(`\n${indent}`);
};

const printMatches = (matches: SkillMatchResultDto[]): void => {
    console.log('\n  ┌─────────────────────────────────────────────────────┐');
    console.log('  │              AI Recommended Resources               │');
    console.log('  └─────────────────────────────────────────────────────┘');
    if (matches.length === 0) {
        console.log('\n  No resources found with skills matching this requirement.');
        console.log('  Tip: Check that the skill is registered under the resource\'s profile,');
        console.log('       or try a different keyword (e.g. "React" instead of "React developer").');
        return;
    }
    matches.forEach((match, i) => {
        const availBar = '█'.repeat(Math.round(match.freePercent / 10)) + '░'.repeat(10 - Math.round(match.freePercent / 10));
        console.log(`\n  ${i + 1}. ${match.fullName}`);
        console.log(`     Availability : ${availBar} ${match.freePercent}% free`);
        console.log(`     Manager      : ${match.currentManager ?? '(unassigned)'}`);
        console.log(`     Skills       : ${wrapReason(match.skills.length > 0 ? match.skills.join(', ') : '(none listed)')}`);
        console.log(`     Reason       : ${wrapReason(match.reason)}`);
    });
    console.log('\n  ─────────────────────────────────────────────────────');
    console.log('  Note: Contact the resource\'s manager to arrange allocation.');
    console.log('        If they are not on your team, ask an admin to reassign.');
};

// Returns the userId of the selected match (or null if cancelled/no match)
export const runSkillMatchFlow = async (): Promise<number | null> => {
    display.header('AI Skill Match');

    let projects: ManagerProjectDto[];
    try {
        projects = await managerApiService.getProjects();
    } catch (error) {
        console.log(`\n  Error loading projects: ${extractErrorMessage(error)}`);
        return null;
    }

    if (projects.length === 0) {
        console.log('\n  You have no projects to search for.');
        return null;
    }

    console.log('\n  Select the project you need a resource for:');
    projects.forEach((p) => console.log(`    ${p.id}. ${p.name}  (${p.status})`));
    const idInput = (await prompt('\n  Enter Project ID')).trim();
    const project = projects.find((p) => p.id === Number(idInput));
    if (!project) {
        console.log('  Invalid project selection.');
        return null;
    }

    console.log(`\n  Describe the skill requirement for [${project.name}] (e.g. "React developer for 3 months"):`);
    const requirement = (await prompt('  > ')).trim();
    if (!requirement) {
        console.log('  Requirement cannot be empty.');
        return null;
    }

    console.log('\n  Asking AI...');
    let result;
    try {
        result = await aiApiService.skillMatch(requirement, project.name);
    } catch (error) {
        console.log(`\n  Error: ${extractErrorMessage(error)}`);
        return null;
    }

    printMatches(result.matches);
    return null;
};

export const SkillMatchScreen = {
    async show(): Promise<void> {
        await runSkillMatchFlow();
        await prompt('\n  Press Enter to continue');
    },
};
