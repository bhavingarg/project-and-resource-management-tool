import { ProjectHealth } from '../../models/manager.dto';

const HEALTH_LABELS: Record<ProjectHealth, string> = {
    ON_TRACK: '🟢 ON TRACK',
    ATTENTION: '🟡 ATTENTION',
    AT_RISK: '🔴 AT RISK',
};

export const formatHealth = (health: ProjectHealth): string => HEALTH_LABELS[health] ?? health;

export const formatAvailability = (utilisationPercent: number): string => {
    if (utilisationPercent >= 100) return 'FULL';
    return `${100 - utilisationPercent}% free`;
};
