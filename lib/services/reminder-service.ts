import sql from '@/lib/db'
import { CLIENT_ASSUMPTIONS } from '@/lib/config/client-assumptions'

export interface ReminderParams {
  findingId?: string;
  invoiceId?: string;
  ownerRole: string;
  dueDate: Date;
  message: string;
}

export class ReminderService {
  static async createReminder(params: ReminderParams) {
    const [reminder] = await sql`
      INSERT INTO reminders (
        finding_id,
        invoice_id,
        owner_role,
        due_date,
        message,
        status
      ) VALUES (
        ${params.findingId},
        ${params.invoiceId},
        ${params.ownerRole},
        ${params.dueDate},
        ${params.message},
        'scheduled'
      )
      RETURNING *
    `;

    // Audit log
    await sql`
      INSERT INTO audit_log (event_type, invoice_id, finding_id, actor, action)
      VALUES ('REMINDER_CREATED', ${params.invoiceId}, ${params.findingId}, 'SYSTEM', ${`Internal reminder scheduled for ${params.ownerRole}`})
    `;

    return reminder;
  }

  static async markCompleted(id: string, actor: string) {
    const [updated] = await sql`
      UPDATE reminders 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    // Audit log
    await sql`
      INSERT INTO audit_log (event_type, invoice_id, finding_id, actor, action)
      VALUES ('REMINDER_COMPLETED', ${updated.invoice_id}, ${updated.finding_id}, ${actor}, 'Reminder marked as completed')
    `;

    return updated;
  }

  static async getRemindersByRole(role: string) {
    return await sql`
      SELECT * FROM reminders 
      WHERE owner_role = ${role} AND status IN ('scheduled', 'due')
      ORDER BY due_date ASC
    `;
  }

  /**
   * Automatically schedules reminders based on workflow status changes
   */
  static async scheduleWorkflowReminders(type: 'INVOICE' | 'FINDING', id: string, status: string) {
    const now = new Date();
    
    if (type === 'INVOICE') {
      if (status === 'pending_approval') {
        const dueDate = new Date(now.getTime() + CLIENT_ASSUMPTIONS.reminders.invoiceApprovalPending * 24 * 60 * 60 * 1000);
        await this.createReminder({
          invoiceId: id,
          ownerRole: 'FINANCE_CONTROLLER',
          dueDate,
          message: 'Invoice approval pending review'
        });
      } else if (status === 'approved') {
        const dueDate = new Date(now.getTime() + CLIENT_ASSUMPTIONS.reminders.sap_entry_pending * 24 * 60 * 60 * 1000);
        await this.createReminder({
          invoiceId: id,
          ownerRole: 'FINANCE_CONTROLLER',
          dueDate,
          message: 'Approved invoice pending SAP entry'
        });
      }
    } else if (type === 'FINDING') {
      if (status === 'open' || status === 'routed') {
        // Find owner role from finding
        const finding = (await sql`SELECT * FROM findings WHERE id = ${id}`)[0];
        if (finding) {
          const ownerRole = finding.routed_to || 'OPERATIONS_MANAGER';
          const dueDate = new Date(now.getTime() + CLIENT_ASSUMPTIONS.reminders.ldEvidenceReviewPending * 24 * 60 * 60 * 1000);
          await this.createReminder({
            findingId: id,
            ownerRole,
            dueDate,
            message: `Action required on exception: ${finding.check_id}`
          });
        }
      }
    }
  }
}
