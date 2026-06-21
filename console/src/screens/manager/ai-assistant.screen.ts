import { prompt } from '../../utils/input.util';
import { display } from '../../utils/display.util';
import { SkillMatchScreen } from './skill-match.screen';
import { RiskSummaryScreen } from './risk-summary.screen';
import { TeamStaffScreen } from './team-staff.screen';

export const AiAssistantScreen = {
    async show(): Promise<void> {
        while (true) {
            display.header('AI Assistant');
            console.log('\n1. Skill Match    (find the best resource for a single requirement)');
            console.log('2. Team Staffing  (define all roles at once — AI fills the whole team)');
            console.log('3. Risk Summary   (AI analysis of a project\'s risks)');
            console.log('4. Back\n');

            const option = (await prompt('Enter option')).trim();

            switch (option) {
                case '1':
                    await SkillMatchScreen.show();
                    break;
                case '2':
                    await TeamStaffScreen.show();
                    break;
                case '3':
                    await RiskSummaryScreen.show();
                    break;
                case '4':
                    return;
                default:
                    console.log('  Invalid option.');
            }
        }
    },
};
