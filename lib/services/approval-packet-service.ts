import PDFDocument from 'pdfkit';
import { formatINR } from '../utils';

export class ApprovalPacketService {
  static async generate(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: any[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('Wolvio CEI — Approval Packet', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        // Phase 1 Disclaimer
        doc.fontSize(9).font('Helvetica-Oblique')
          .fillColor('#CC4400')
          .text('INTERNAL VALIDATION AND APPROVAL PACKET', { align: 'center' });
        doc.text('This is not an official SAP invoice and does not represent ERP posting.', { align: 'center' });
        doc.text('Final financial execution remains with the Finance team in SAP.', { align: 'center' });
        doc.fillColor('black').moveDown(2);

        // 1. Contract Info
        doc.fontSize(14).font('Helvetica-Bold').text('1. Contract Summary');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Customer: ${data.contract.customer_name}`);
        doc.text(`Contract ID: ${data.contract.contract_id}`);
        doc.text(`Site: ${data.contract.site_name} / ${data.contract.asset_location}`);
        doc.moveDown();

        // 2. Financials
        doc.fontSize(14).font('Helvetica-Bold').text('2. Invoice Calculation');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Period: ${data.invoice.period_start} to ${data.invoice.period_end}`);
        doc.moveDown(0.5);
        
        doc.text(`Base Fee (Escalated): ${formatINR(data.invoice.base_amount)}`);
        doc.text(`Variable Component: ${formatINR(data.invoice.variable_amount)}`);
        doc.text(`GST: ${formatINR(data.invoice.tax_amount)}`);
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica-Bold').text(`Total Invoice: ${formatINR(data.invoice.total_amount)}`);
        doc.moveDown();

        // 3. Variance Explanation
        doc.fontSize(14).font('Helvetica-Bold').text('3. Variance Explanation (Plain-English)');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Approval Status: ${data.invoice.status.toUpperCase()}`);
        doc.moveDown(0.5);
        doc.text('Explanation generated from deterministic calculation results:');
        doc.text(data.invoice.confidence_explanation, { align: 'justify' });
        doc.moveDown();

        // 4. Deterministic Traceability
        doc.fontSize(14).font('Helvetica-Bold').text('4. Deterministic Traceability');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(8).font('Helvetica');
        const evidence = data.invoice.calculation_evidence || {};
        doc.text(`WPI Escalation: ${JSON.stringify(evidence.wpiResult || {})}`);
        doc.text(`Variable Calc: ${JSON.stringify(evidence.varResult || {})}`);
        doc.moveDown();
        
        // 5. Approval Info
        if (data.approval) {
          doc.fontSize(14).font('Helvetica-Bold').text('5. Approval Record');
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);
          doc.fontSize(10).font('Helvetica');
          doc.text(`Approver: ${data.approval.actor}`);
          doc.text(`Role: ${data.approval.role}`);
          doc.text(`Action: ${data.approval.action}`);
          doc.text(`Date: ${new Date(data.approval.created_at).toLocaleString()}`);
          doc.text(`Comments: ${data.approval.comments || 'N/A'}`);
          doc.moveDown();
        }

        // Footer
        doc.moveDown(4);
        doc.fontSize(8).font('Helvetica-Oblique').text('SAP-entry-ready validation packet. Not an official SAP invoice and does not represent ERP posting.', { align: 'center' });
        doc.text('Calculations verified by Wolvio CEI deterministic math engine. AI used only for variance explanation text.', { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
