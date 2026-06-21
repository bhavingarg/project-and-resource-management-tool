import { AppConfig } from '../config/app.config';
import nodemailer from 'nodemailer';

export interface IEmailService {
    sendTimesheetReminder1(to: string, employeeName: string, weekStartDate: string): Promise<void>;
    sendTimesheetReminder2(to: string, employeeName: string, weekStartDate: string): Promise<void>;
    sendFreezeNotification(
        employeeEmail: string,
        employeeName: string,
        managerEmail: string,
        managerName: string,
        weekStartDate: string,
    ): Promise<void>;
}

const sendMail = async (
    to: string,
    subject: string,
    text: string,
): Promise<void> => {
    if (!AppConfig.smtpHost) {
        // No SMTP configured — emit to console so the notification is not silently dropped.
        console.log(`[Email] TO: ${to} | SUBJECT: ${subject}\n${text}\n`);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: AppConfig.smtpHost,
        port: AppConfig.smtpPort,
        secure: AppConfig.smtpPort === 465,
        auth: AppConfig.smtpUser
            ? { user: AppConfig.smtpUser, pass: AppConfig.smtpPass }
            : undefined,
    });

    await transporter.sendMail({
        from: AppConfig.smtpFrom,
        to,
        subject,
        text,
    });
};

export const EmailService: IEmailService = {
    async sendTimesheetReminder1(to, employeeName, weekStartDate): Promise<void> {
        await sendMail(
            to,
            'Action Required: Timesheet Not Submitted',
            `Hi ${employeeName},\n\n` +
            `This is a reminder that your timesheet for the week of ${weekStartDate} has not been submitted.\n\n` +
            `Please log in and submit your timesheet as soon as possible.\n\n` +
            `If you do not submit your timesheet, a second reminder will be sent and your timesheet access may be restricted.\n\n` +
            `PRM System`,
        );
    },

    async sendTimesheetReminder2(to, employeeName, weekStartDate): Promise<void> {
        await sendMail(
            to,
            'Final Reminder: Timesheet Still Pending',
            `Hi ${employeeName},\n\n` +
            `This is your second and final reminder that your timesheet for the week of ${weekStartDate} remains unsubmitted.\n\n` +
            `If you do not submit your timesheet by end of today, your timesheet access will be frozen and your manager will be notified.\n\n` +
            `PRM System`,
        );
    },

    async sendFreezeNotification(employeeEmail, employeeName, managerEmail, managerName, weekStartDate): Promise<void> {
        const employeeMessage =
            `Hi ${employeeName},\n\n` +
            `Your timesheet access has been frozen because the timesheet for the week of ${weekStartDate} was not submitted despite two reminders.\n\n` +
            `You can still log in and view your timesheets, but you cannot create, update, or submit entries until your manager restores your access.\n\n` +
            `Please contact your manager (${managerName}) to have your access restored.\n\n` +
            `PRM System`;

        const managerMessage =
            `Hi ${managerName},\n\n` +
            `This is to inform you that the timesheet access for ${employeeName} (${employeeEmail}) has been frozen.\n\n` +
            `The timesheet for the week of ${weekStartDate} was not submitted after two automated reminders.\n\n` +
            `Please review and restore their access via the PRM portal once the issue has been addressed.\n\n` +
            `PRM System`;

        await Promise.all([
            sendMail(employeeEmail, 'Timesheet Access Frozen', employeeMessage),
            sendMail(managerEmail, `Timesheet Access Frozen — ${employeeName}`, managerMessage),
        ]);
    },
};
