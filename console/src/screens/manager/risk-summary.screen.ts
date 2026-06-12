import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { managerApiService } from '../../services/manager.service';
import { aiApiService } from '../../services/ai.service';
import { ManagerProjectDto } from '../../models/manager.dto';

const wrapText = (text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
        if (current.length + word.length + 1 > maxWidth && current.length > 0) {
            lines.push(current);
            current = word;
        } else {
            current = current.length === 0 ? word : `${current} ${word}`;
        }
    }
    if (current.length > 0) lines.push(current);
    return lines;
};

const selectProject = async (): Promise<ManagerProjectDto | null> => {
    let projects: ManagerProjectDto[];
    try {
        projects = await managerApiService.getProjects();
    } catch (error) {
        console.log(`\n  Error loading projects: ${extractErrorMessage(error)}`);
        return null;
    }

    if (projects.length === 0) {
        console.log('\n  You have no projects.');
        return null;
    }

    console.log('\n  Your Projects:');
    projects.forEach((p) => console.log(`    ${p.id}. ${p.name}  (${p.status})`));

    const idInput = (await prompt('\n  Enter Project ID')).trim();
    const project = projects.find((p) => p.id === Number(idInput));
    if (!project) {
        console.log('  Invalid project selection.');
        return null;
    }
    return project;
};

// Shows risk summary for a specific project (used from MyProjectsScreen)
export const showRiskSummaryForProject = async (projectId: number, projectName: string): Promise<void> => {
    console.log('\n  Analysing project risks...');
    let result;
    try {
        result = await aiApiService.riskSummary(projectId);
    } catch (error) {
        console.log(`\n  Error: ${extractErrorMessage(error)}`);
        await prompt('\n  Press Enter to continue');
        return;
    }

    console.log(`\n  ── AI Risk Summary: ${projectName} ─────────────`);
    const lines = wrapText(result.summary, 56);
    lines.forEach((line) => console.log(`  ${line}`));
    console.log('\n  ──────────────────────────────────────────────');
    console.log('  ⚠  AI-generated summary — verify with your team.');
    await prompt('\n  Press Enter to continue');
};

export const RiskSummaryScreen = {
    async show(): Promise<void> {
        display.header('AI Risk Summary');

        const project = await selectProject();
        if (!project) {
            await prompt('\n  Press Enter to continue');
            return;
        }

        await showRiskSummaryForProject(project.id, project.name);
    },
};
