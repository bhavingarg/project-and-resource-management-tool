import { prompt } from '../../../utils/input.util';
import { display } from '../../../utils/display.util';
import { extractErrorMessage } from '../../../utils/error.util';
import { employeeApiService } from '../../../services/employee.service';
import { EmployeeSummaryDto, EmployeeStatus } from '../../../models/employee.dto';

const printEmployeesTable = (employees: EmployeeSummaryDto[]): void => {
    const separator = `  ${'─'.repeat(50)}`;
    const allocatedCount = employees.filter((e) => e.status === 'ALLOCATED').length;
    const benchCount = employees.length - allocatedCount;

    console.log(separator);
    console.log(`  ${'User ID'.padEnd(8)} ${'Name'.padEnd(20)} ${'Department'.padEnd(14)} Status`);
    console.log(separator);
    for (const emp of employees) {
        const active = emp.isActive ? '' : ' (Inactive)';
        console.log(
            `  ${String(emp.userId).padEnd(8)} ${emp.fullName.padEnd(20)} ${emp.department.padEnd(14)} ${emp.status}${active}`,
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

    const byEmployeeStatus = (status: EmployeeStatus, label: string): FilterResult => ({
        employees: employees.filter((e) => e.status === status),
        label,
    });
    switch (choice) {
        case '1': return byEmployeeStatus('ALLOCATED', 'Status = Allocated');
        case '2': return byEmployeeStatus('BENCH', 'Status = Bench');
        case '3': return { employees: employees.filter((e) => e.isActive), label: 'Status = Active' };
        case '4': return { employees: employees.filter((e) => !e.isActive), label: 'Status = Inactive' };
        default:
            console.log('  Invalid selection.');
            return null;
    }
};

const promptDepartmentFilter = async (employees: EmployeeSummaryDto[]): Promise<FilterResult | null> => {
    const departments = [...new Set(employees.map((e) => e.department))].sort();
    if (departments.length === 0) {
        console.log('  No departments available.');
        return null;
    }

    console.log('\n  Filter by department:');
    departments.forEach((dept, index) => {
        console.log(`    ${index + 1}. ${dept}`);
    });
    const choice = (await prompt('  Select: ')).trim();
    const index = Number(choice) - 1;
    if (isNaN(index) || index < 0 || index >= departments.length) {
        console.log('  Invalid selection.');
        return null;
    }
    const department = departments[index];
    return {
        employees: employees.filter((e) => e.department === department),
        label: `Department = ${department}`,
    };
};

export const ViewEmployeesScreen = {
    async show(): Promise<void> {
        display.header('All Employees');

        let allEmployees: EmployeeSummaryDto[];
        try {
            allEmployees = await employeeApiService.getAllEmployees();
        } catch (error) {
            console.log(`  Error: ${extractErrorMessage(error)}`);
            await prompt('\n  Press Enter to continue...');
            return;
        }

        if (allEmployees.length === 0) {
            console.log('  No employees found.');
            await prompt('\n  Press Enter to continue...');
            return;
        }

        let view = allEmployees;
        let activeFilter = '';

        while (true) {
            display.header('All Employees');
            if (activeFilter) {
                console.log(`  Filter: ${activeFilter}`);
            }
            printEmployeesTable(view);

            console.log('');
            console.log('  [F] Filter by status/department   [C] Clear filter   [B] Back');
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
                console.log('\n  Filter by:');
                console.log('    1. Status');
                console.log('    2. Department');
                const filterType = (await prompt('  Select: ')).trim();

                if (filterType === '1') {
                    const filtered = await promptStatusFilter(allEmployees);
                    if (filtered) {
                        view = filtered.employees;
                        activeFilter = filtered.label;
                    }
                } else if (filterType === '2') {
                    const filtered = await promptDepartmentFilter(allEmployees);
                    if (filtered) {
                        view = filtered.employees;
                        activeFilter = filtered.label;
                    }
                } else {
                    console.log('  Invalid selection.');
                }
                continue;
            }

            console.log('  Invalid option.');
        }
    },
};
