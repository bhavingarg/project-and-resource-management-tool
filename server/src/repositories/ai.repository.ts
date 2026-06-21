import { Pool, RowDataPacket } from 'mysql2/promise';
import { DatabaseConnection } from '../config/database.config';
import { AppConfig } from '../config/app.config';

const ISO_DATE_FORMAT = '%Y-%m-%d';
const RECENT_ACTIVITY_WEEKS = 4;

export interface SkillMatchCandidateRecord {
    userId: number;
    fullName: string;
    utilisationPercent: number;
    skills: string[];
    recentActivityTags: string[];
    currentManagerName: string | null;
}

export interface ProjectEffortRecord {
    resourceName: string;
    utilisationPercent: number;
    expectedHoursPerWeek: number;
    avgHoursPerWeek: number;
    weeksSubmitted: number;
    allocationDate: string;
}

export interface ProjectRiskDataRecord {
    projectName: string;
    endDate: string;
    health: string;
    milestones: {
        title: string;
        dueDate: string;
        status: string;
        isOverdue: boolean;
    }[];
    resourceEffort: ProjectEffortRecord[];
}

interface CandidateRow extends RowDataPacket {
    user_id: number;
    full_name: string;
    utilisation_percent: number;
    manager_name: string | null;
}

interface SkillRow extends RowDataPacket {
    user_id: number;
    skill_name: string;
}

interface TagRow extends RowDataPacket {
    user_id: number;
    tag_name: string;
}

interface MilestoneRow extends RowDataPacket {
    title: string;
    due_date: string;
    status: string;
}

interface ProjectInfoRow extends RowDataPacket {
    name: string;
    end_date: string;
    health: string;
}

interface EffortRow extends RowDataPacket {
    resource_name: string;
    utilisation_percent: number;
    avg_hours_per_week: number;
    weeks_submitted: number;
    from_date: string;
}

export interface GapCandidateRecord {
    fullName: string;
    availableFrom: string | null; // earliest date a current allocation ends
}

export interface IAiRepository {
    findSkillMatchCandidates(): Promise<SkillMatchCandidateRecord[]>;
    findProjectRiskData(managerUserId: number, projectId: number): Promise<ProjectRiskDataRecord | null>;
    findAllocatedCandidatesWithSkill(skillKeyword: string): Promise<GapCandidateRecord[]>;
}

export const AiRepository: IAiRepository = {
    async findSkillMatchCandidates(): Promise<SkillMatchCandidateRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();

        // Get all active RESOURCE-role users across the org with their utilisation
        const [candidateRows] = await pool.execute<CandidateRow[]>(
            `SELECT u.id AS user_id, u.full_name,
                    COALESCE((
                        SELECT SUM(a.utilisation_percent) FROM allocations a
                        WHERE a.resource_id = u.id AND a.is_active = 1
                          AND CURDATE() BETWEEN a.from_date AND a.to_date
                    ), 0) AS utilisation_percent,
                    (SELECT um.full_name FROM resource_profiles rp
                     JOIN users um ON um.id = rp.reporting_to
                     WHERE rp.user_id = u.id LIMIT 1) AS manager_name
             FROM users u
             JOIN roles r ON r.id = u.role_id AND r.name = 'RESOURCE'
             WHERE u.is_active = 1
               AND COALESCE((
                        SELECT SUM(a.utilisation_percent) FROM allocations a
                        WHERE a.resource_id = u.id AND a.is_active = 1
                          AND CURDATE() BETWEEN a.from_date AND a.to_date
                    ), 0) < 100
             ORDER BY utilisation_percent ASC`,
        );

        if (candidateRows.length === 0) return [];

        const userIds = candidateRows.map((r) => r.user_id);
        const placeholders = userIds.map(() => '?').join(', ');

        // Batch-fetch skills for all candidates
        const [skillRows] = await pool.execute<SkillRow[]>(
            `SELECT user_id, skill_name
             FROM resource_skills
             WHERE user_id IN (${placeholders})
             ORDER BY user_id, skill_name`,
            userIds,
        );

        // Batch-fetch recent activity tags for all candidates
        const [tagRows] = await pool.execute<TagRow[]>(
            `SELECT a.resource_id AS user_id, tt.tag_name
             FROM timesheet_tags tt
             JOIN timesheets ts ON tt.timesheet_id = ts.id
             JOIN allocations a ON ts.allocation_id = a.id
             WHERE a.resource_id IN (${placeholders})
               AND ts.week_start_date >= DATE_SUB(CURDATE(), INTERVAL ${RECENT_ACTIVITY_WEEKS} WEEK)
             GROUP BY a.resource_id, tt.tag_name
             ORDER BY a.resource_id, tt.tag_name`,
            userIds,
        );

        // Index by userId
        const skillsByUser = new Map<number, string[]>();
        for (const row of skillRows) {
            const arr = skillsByUser.get(row.user_id) ?? [];
            arr.push(row.skill_name);
            skillsByUser.set(row.user_id, arr);
        }

        const tagsByUser = new Map<number, string[]>();
        for (const row of tagRows) {
            const arr = tagsByUser.get(row.user_id) ?? [];
            arr.push(row.tag_name);
            tagsByUser.set(row.user_id, arr);
        }

        return candidateRows.map((r) => ({
            userId: r.user_id,
            fullName: r.full_name,
            utilisationPercent: Number(r.utilisation_percent),
            skills: skillsByUser.get(r.user_id) ?? [],
            recentActivityTags: tagsByUser.get(r.user_id) ?? [],
            currentManagerName: r.manager_name ?? null,
        }));
    },

    async findProjectRiskData(managerUserId: number, projectId: number): Promise<ProjectRiskDataRecord | null> {
        const pool: Pool = DatabaseConnection.getPool();

        // Verify the project belongs to this manager
        const [projectRows] = await pool.execute<ProjectInfoRow[]>(
            `SELECT name, DATE_FORMAT(end_date, '${ISO_DATE_FORMAT}') AS end_date, health
             FROM projects WHERE id = ? AND manager_id = ?`,
            [projectId, managerUserId],
        );
        if (projectRows.length === 0) return null;

        const project = projectRows[0];
        const today = new Date().toISOString().slice(0, 10);

        // Fetch milestones
        const [milestoneRows] = await pool.execute<MilestoneRow[]>(
            `SELECT title, DATE_FORMAT(due_date, '${ISO_DATE_FORMAT}') AS due_date, status
             FROM milestones WHERE project_id = ? ORDER BY due_date ASC`,
            [projectId],
        );

        // Fetch resource effort (avg hours worked per week for the last N weeks)
        const maxWeeklyHours = AppConfig.maxWeeklyHours;
        const [effortRows] = await pool.execute<EffortRow[]>(
            `SELECT u.full_name AS resource_name,
                    a.utilisation_percent,
                    DATE_FORMAT(a.from_date, '${ISO_DATE_FORMAT}') AS from_date,
                    COALESCE(AVG(ts.hours_worked), 0) AS avg_hours_per_week,
                    COUNT(ts.id) AS weeks_submitted
             FROM allocations a
             JOIN users u ON a.resource_id = u.id
             LEFT JOIN timesheets ts ON ts.allocation_id = a.id
               AND ts.week_start_date >= DATE_SUB(CURDATE(), INTERVAL ${RECENT_ACTIVITY_WEEKS} WEEK)
               AND ts.status = 'SUBMITTED'
             WHERE a.project_id = ? AND a.is_active = 1
             GROUP BY a.id, u.full_name, a.utilisation_percent, a.from_date
             ORDER BY u.full_name`,
            [projectId],
        );

        return {
            projectName: project.name,
            endDate: project.end_date,
            health: project.health,
            milestones: milestoneRows.map((m) => ({
                title: m.title,
                dueDate: m.due_date,
                status: m.status,
                isOverdue: m.status !== 'DONE' && m.due_date < today,
            })),
            resourceEffort: effortRows.map((e) => ({
                resourceName: e.resource_name,
                utilisationPercent: e.utilisation_percent,
                expectedHoursPerWeek: Math.round((e.utilisation_percent / 100) * maxWeeklyHours),
                avgHoursPerWeek: Math.round(Number(e.avg_hours_per_week) * 10) / 10,
                weeksSubmitted: Number(e.weeks_submitted),
                allocationDate: e.from_date,
            })),
        };
    },

    async findAllocatedCandidatesWithSkill(skillKeyword: string): Promise<GapCandidateRecord[]> {
        const pool: Pool = DatabaseConnection.getPool();
        const kw = `%${skillKeyword}%`;

        interface GapRow extends RowDataPacket {
            full_name: string;
            available_from: string | null;
        }

        const [rows] = await pool.execute<GapRow[]>(
            `SELECT u.full_name,
                    MIN(DATE_FORMAT(a.to_date, '${ISO_DATE_FORMAT}')) AS available_from
             FROM users u
             JOIN roles r ON r.id = u.role_id AND r.name = 'RESOURCE'
             JOIN resource_skills rs ON rs.user_id = u.id
             LEFT JOIN allocations a ON a.resource_id = u.id
               AND a.is_active = 1
               AND CURDATE() BETWEEN a.from_date AND a.to_date
             WHERE u.is_active = 1
               AND rs.skill_name LIKE ?
             GROUP BY u.id, u.full_name
             ORDER BY available_from ASC`,
            [kw],
        );

        return rows.map((r) => ({
            fullName: r.full_name,
            availableFrom: r.available_from ?? null,
        }));
    },
};
