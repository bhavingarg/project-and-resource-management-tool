import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { employeeApiService } from '../../../services/employee.service';
import { EmployeeSummaryDto, EmployeeStatus } from '../../../models/employee.dto';

const printResourcesTable = (employees: EmployeeSummaryDto[]): void => {
    const separator = `  ${'─'.repeat(46)}`;
    const allocatedCount = employees.filter((e) => e.status === 'ALLOCATED').length;
    const benchCount = employees.filter((e) => e.status === 'BENCH' || e.status === null).length;

    console.log(separator);
    console.log(`  ${'User ID'.padEnd(8)} ${'Name'.padEnd(25)} Status`);
    console.log(separator);
    for (const emp of employees) {
        const active = emp.isActive ? '' : ' (Inactive)';
        const status = emp.status ?? 'BENCH';
        console.log(
            `  ${String(emp.userId).padEnd(8)} ${emp.fullName.padEnd(25)} ${status}${active}`,
        );
    }
    console.log(separator);
    console.log(`  Total: ${employees.length}   |   Allocated: ${allocatedCount}   |   Bench: ${benchCount}`);
};

interface FilterResult {
    employees: EmployeeSummaryDto[];
    label: string;
}

const promptStatusFilter = async (employees: EmployeeSummaryDto[]): Promise<FilterResult | null> => {
    console.log('\n  Filter by status:');
    console.log('    1. Allocated');
    console.log('    2. Bench');
    console.log('    3. Active');
    console.log('    4. Inactive');
    const choice = (await prompt('  Select: ')).trim();

    const byResourceStatus = (status: EmployeeStatus, label: string): FilterResult => ({
        employees: employees.filter((e) => (e.status ?? 'BENCH') === status),
        label,
    });
    switch (choice) {
        case '1': return byResourceStatus('ALLOCATED', 'Status = Allocated');
        case '2': return byResourceStatus('BENCH', 'Status = Bench');
        case '3': return { employees: employees.filter((e) => e.isActive), label: 'Status = Active' };
        case '4': return { employees: employees.filter((e) => !e.isActive), label: 'Status = Inactive' };
        default:
            console.log('  Invalid selection.');
            return null;
    }
};


export const ViewEmployeesScreen = {
    async show(): Promise<void> {
        display.header('All Resources');

        let allEmployees: EmployeeSummaryDto[];
        try {
            allEmployees = await employeeApiService.getAllEmployees();
        } catch (error) {
            console.log(`  Error: ${extractErrorMessage(error)}`);
            await prompt('\n  Press Enter to continue...');
            return;
        }

        if (allEmployees.length === 0) {
            console.log('  No resources found.');
            await prompt('\n  Press Enter to continue...');
            return;
        }

        let view = allEmployees;
        let activeFilter = '';

        while (true) {
            display.header('All Resources');
            if (activeFilter) {
                console.log(`  Filter: ${activeFilter}`);
            }
            printResourcesTable(view);

            console.log('');
            console.log('  [F] Filter by status   [C] Clear filter   [B] Back');
            const choice = (await prompt('  Select: ')).trim().toUpperCase();

            if (choice === 'B') {
                return;
            }

            if (choice === 'C') {
                view = allEmployees;
                activeFilter = '';
                continue;
            }

            if (choice === 'F') {
                const filtered = await promptStatusFilter(allEmployees);
                if (filtered) {
                    view = filtered.employees;
                    activeFilter = filtered.label;
                }
                continue;
            }

            console.log('  Invalid option.');
        }
    },
};
