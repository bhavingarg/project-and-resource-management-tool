import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { employeeApiService } from '../../../services/employee.service';
import { EmployeeSkillDto, SkillCategory, ProficiencyLevel } from '../../../models/employee.dto';

const CATEGORY_MAP: Record<string, SkillCategory> = {
    '1': 'BACKEND',
    '2': 'FRONTEND',
    '3': 'DEVOPS',
    '4': 'QA',
    '5': 'OTHER',
};

const PROFICIENCY_MAP: Record<string, ProficiencyLevel> = {
    '1': 'BEGINNER',
    '2': 'INTERMEDIATE',
    '3': 'ADVANCED',
};

const printSkillsTable = (skills: EmployeeSkillDto[]): void => {
    const separator = `  ${'─'.repeat(50)}`;
    console.log(separator);
    for (let i = 0; i < skills.length; i++) {
        const s = skills[i];
        console.log(`  ${String(i + 1).padEnd(4)} ${s.skillName.padEnd(20)} ${s.proficiencyLevel}`);
    }
    console.log(separator);
};

const addSkillFlow = async (employeeId: number): Promise<void> => {
    const skillName = (await prompt('  Skill Name        : ')).trim();
    if (!skillName) return;

    console.log('  Category          : (1) Backend  (2) Frontend  (3) DevOps  (4) QA  (5) Other');
    const catInput = (await prompt('  Enter choice      : ')).trim();
    const category = CATEGORY_MAP[catInput];
    if (!category) { console.log('  Invalid category.'); return; }

    console.log('  Proficiency Level : (1) Beginner  (2) Intermediate  (3) Advanced');
    const profInput = (await prompt('  Enter choice      : ')).trim();
    const proficiencyLevel = PROFICIENCY_MAP[profInput];
    if (!proficiencyLevel) { console.log('  Invalid proficiency level.'); return; }

    await employeeApiService.addSkill(employeeId, { skillName, category, proficiencyLevel });
    console.log('\n  Skill added. ✓');
};

const updateSkillFlow = async (employeeId: number, skills: EmployeeSkillDto[]): Promise<void> => {
    const input = (await prompt('  Enter skill # to update: ')).trim();
    const index = Number(input) - 1;
    if (isNaN(index) || index < 0 || index >= skills.length) {
        console.log('  Invalid selection.');
        return;
    }
    const skill = skills[index];
    console.log(`  Updating: ${skill.skillName}`);
    console.log('  New Proficiency : (1) Beginner  (2) Intermediate  (3) Advanced');
    const profInput = (await prompt('  Enter choice    : ')).trim();
    const proficiencyLevel = PROFICIENCY_MAP[profInput];
    if (!proficiencyLevel) { console.log('  Invalid proficiency level.'); return; }

    await employeeApiService.updateSkill(employeeId, skill.id, { proficiencyLevel });
    console.log('\n  Skill updated. ✓');
};

const removeSkillFlow = async (employeeId: number, skills: EmployeeSkillDto[]): Promise<void> => {
    const input = (await prompt('  Enter skill # to remove: ')).trim();
    const index = Number(input) - 1;
    if (isNaN(index) || index < 0 || index >= skills.length) {
        console.log('  Invalid selection.');
        return;
    }
    const skill = skills[index];
    const confirm = (await prompt(`  Remove '${skill.skillName}'? (Y/N): `)).trim().toUpperCase();
    if (confirm !== 'Y') { console.log('  Cancelled.'); return; }

    await employeeApiService.removeSkill(employeeId, skill.id);
    console.log('\n  Skill removed. ✓');
};

export const ManageSkillsScreen = {
    async show(): Promise<void> {
        display.header('Manage Resource Skills');

        const idInput = (await prompt('  Enter User ID: ')).trim();
        if (!idInput) return;

        const userId = Number(idInput);
        try {
            const employee = await employeeApiService.getEmployee(userId);
            console.log(`\n  ── ${employee.fullName} ${'─'.repeat(Math.max(0, 38 - employee.fullName.length))}`);

            while (true) {
                const skills = await employeeApiService.getSkills(userId);

                if (skills.length === 0) {
                    console.log('  Current Skills: (none)');
                } else {
                    console.log('  Current Skills:');
                    printSkillsTable(skills);
                }

                console.log('\n  1. Add Skill');
                console.log('  2. Update Proficiency Level');
                console.log('  3. Remove Skill');
                console.log('  4. Back');

                const choice = (await prompt('\n  Enter option: ')).trim();
                try {
                    if (choice === '1') {
                        await addSkillFlow(userId);
                    } else if (choice === '2') {
                        if (skills.length === 0) { console.log('  No skills to update.'); }
                        else { await updateSkillFlow(userId, skills); }
                    } else if (choice === '3') {
                        if (skills.length === 0) { console.log('  No skills to remove.'); }
                        else { await removeSkillFlow(userId, skills); }
                    } else if (choice === '4') {
                        return;
                    } else {
                        console.log('  Invalid option.');
                    }
                } catch (error) {
                    console.log(`  Error: ${extractErrorMessage(error)}`);
                }

                await prompt('\n  Press Enter to continue...');
            }
        } catch (error) {
            console.log(`\n  Error: ${extractErrorMessage(error)}`);
            await prompt('\n  Press Enter to continue...');
        }
    },
};
