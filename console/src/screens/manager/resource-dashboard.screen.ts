import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { extractErrorMessage } from '../../utils/error.util';
import { formatDisplayDate } from '../../utils/date.util';
import { managerApiService } from '../../services/manager.service';
import { ResourceDashboardDto, TeamMemberDto, EmployeeDrillDownDto } from '../../models/manager.dto';
import { formatAvailability } from './manager-format';

const printBenchSection = (bench: TeamMemberDto[]): void => {
    console.log(`\n  ON BENCH  (${bench.length} employee(s) available)`);
    console.log(`  ${'─'.repeat(56)}`);
    console.log(`  ${'ID'.padEnd(6)} ${'Name'.padEnd(18)} ${'Department'.padEnd(14)} Skills`);
    for (const member of bench) {
        const skills = member.skills.length > 0 ? member.skills.join(', ') : '(none)';
        console.log(`  ${String(member.userId).padEnd(6)} ${member.fullName.padEnd(18)} ${member.department.padEnd(14)} ${skills}`);
    }
};

const printActiveSection = (active: TeamMemberDto[]): void => {
    console.log('\n  ACTIVE EMPLOYEES');
    console.log(`  ${'─'.repeat(56)}`);
    console.log(`  ${'ID'.padEnd(6)} ${'Name'.padEnd(18)} ${'Alloc %'.padEnd(9)} Availability`);
    for (const member of active) {
        const allocation = `${member.utilisationPercent}%`;
        console.log(`  ${String(member.userId).padEnd(6)} ${member.fullName.padEnd(18)} ${allocation.padEnd(9)} ${formatAvailability(member.utilisationPercent)}`);
    }
};

const printDrillDown = (detail: EmployeeDrillDownDto): void => {
    const statusLabel = detail.status === 'ALLOCATED'
        ? `ALLOCATED (${detail.utilisationPercent}%)`
        : 'BENCH';

    console.log(`\n  ── ${detail.fullName} ${'─'.repeat(Math.max(0, 38 - detail.fullName.length))}`);
    console.log(`  Department     : ${detail.department}`);
    console.log(`  Current Status : ${statusLabel}`);
    console.log(`  Profile Skills : ${detail.skills.length > 0 ? detail.skills.join(', ') : '(none)'}`);

    console.log('\n  Active Allocations:');
    if (detail.activeAllocations.length === 0) {
        console.log('    (none)');
    } else {
        console.log(`    ${'Project'.padEnd(18)} ${'%'.padEnd(5)} ${'From'.padEnd(12)} To`);
        for (const allocation of detail.activeAllocations) {
            console.log(
                `    ${allocation.projectName.padEnd(18)} ${`${allocation.utilisationPercent}%`.padEnd(5)} ` +
                `${formatDisplayDate(allocation.fromDate).padEnd(12)} ${formatDisplayDate(allocation.toDate)}`,
            );
        }
    }

    console.log('\n  Recent Activity Tags (last 4 weeks):');
    console.log(`    ${detail.recentActivityTags.length > 0 ? detail.recentActivityTags.join(', ') : '(none)'}`);
};

const drillIntoEmployee = async (): Promise<void> => {
    const idInput = (await prompt('  Enter Employee ID')).trim();
    if (!idInput) return;

    try {
        const detail = await managerApiService.getEmployeeDrillDown(Number(idInput));
        printDrillDown(detail);
    } catch (error) {
        console.log(`\n  Error: ${extractErrorMessage(error)}`);
    }
    await prompt('\n  Press Enter to continue');
};

const printDashboard = (dashboard: ResourceDashboardDto): void => {
    printBenchSection(dashboard.bench);
    printActiveSection(dashboard.active);

    const partialCount = dashboard.active.filter((member) => member.utilisationPercent < 100).length;
    console.log(`\n  ${'─'.repeat(56)}`);
    console.log(`  Bench: ${dashboard.bench.length}   |   Partial: ${partialCount}`);
};

export const ResourceDashboardScreen = {
    async show(): Promise<void> {
        while (true) {
            display.header('Resource Dashboard');

            let dashboard: ResourceDashboardDto;
            try {
                dashboard = await managerApiService.getResourceDashboard();
            } catch (error) {
                console.log(`  Error: ${extractErrorMessage(error)}`);
                await prompt('\n  Press Enter to continue');
                return;
            }

            if (dashboard.bench.length === 0 && dashboard.active.length === 0) {
                console.log('  No team members found.');
                await prompt('\n  Press Enter to continue');
                return;
            }

            printDashboard(dashboard);

            console.log('\n  [D] Drill into employee details   [B] Back');
            const choice = (await prompt('  Select')).trim().toUpperCase();

            if (choice === 'B') return;
            if (choice === 'D') {
                await drillIntoEmployee();
            } else {
                console.log('  Invalid option.');
            }
        }
    },
};
