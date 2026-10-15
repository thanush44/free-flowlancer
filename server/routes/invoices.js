const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const inrNumberFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatINRPdf(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `INR ${inrNumberFormatter.format(num)}`;
}

router.use(authenticateToken);

// 1. Fetch unbilled logs for a client (and optional date range)
router.get('/unbilled', async (req, res) => {
  try {
    const { client_id, start_date, end_date } = req.query;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const client = await db.getAsync(
      'SELECT id, name, company, default_hourly_rate FROM clients WHERE id = ? AND user_id = ?',
      [client_id, req.user.id]
    );

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    let query = `
      SELECT 
        tl.*,
        p.name AS project_name,
        t.title AS task_title
      FROM time_logs tl
      JOIN projects p ON p.id = tl.project_id AND p.user_id = tl.user_id
      LEFT JOIN tasks t ON t.id = tl.task_id AND t.user_id = tl.user_id
      WHERE tl.user_id = ? 
        AND p.client_id = ? 
        AND tl.is_billed = 0
    `;
    const params = [req.user.id, client_id];

    if (start_date) {
      query += ' AND date(tl.start_time) >= date(?)';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND date(tl.start_time) <= date(?)';
      params.push(end_date);
    }

    query += ' ORDER BY tl.start_time ASC';

    const logs = await db.allAsync(query, params);

    const hourlyRate = client.default_hourly_rate || 50.0;
    const items = logs.map((log) => {
      const hours = parseFloat((log.duration_minutes / 60.0).toFixed(2));
      const amount = parseFloat((hours * hourlyRate).toFixed(2));
      return {
        id: log.id,
        project_name: log.project_name,
        task_title: log.task_title || 'General Work',
        description: log.description || 'Consulting & Development services',
        date: log.start_time ? log.start_time.split('T')[0] : new Date().toISOString().split('T')[0],
        hours,
        rate: hourlyRate,
        amount,
      };
    });

    const calculatedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      client,
      items,
      count: items.length,
      calculated_subtotal: parseFloat(calculatedSubtotal.toFixed(2)),
    });
  } catch (error) {
    console.error('Error fetching unbilled logs:', error);
    res.status(500).json({ error: 'Failed to retrieve unbilled logs' });
  }
});

// 2. GET all invoices for current user
router.get('/', async (req, res) => {
  try {
    const invoices = await db.allAsync(
      `
      SELECT 
        i.*,
        c.name AS client_name,
        c.company AS client_company,
        c.email AS client_email
      FROM invoices i
      JOIN clients c ON c.id = i.client_id AND c.user_id = i.user_id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
      `,
      [req.user.id]
    );

    const parsedInvoices = invoices.map((inv) => ({
      ...inv,
      items: JSON.parse(inv.items_json || '[]'),
    }));

    res.json({ invoices: parsedInvoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to retrieve invoices' });
  }
});

// 3. GET single invoice
router.get('/:id', async (req, res) => {
  try {
    const invoice = await db.getAsync(
      `
      SELECT 
        i.*,
        c.name AS client_name,
        c.company AS client_company,
        c.email AS client_email,
        c.address AS client_address,
        c.phone AS client_phone,
        u.name AS user_name,
        u.email AS user_email
      FROM invoices i
      JOIN clients c ON c.id = i.client_id AND c.user_id = i.user_id
      JOIN users u ON u.id = i.user_id
      WHERE i.id = ? AND i.user_id = ?
      `,
      [req.params.id, req.user.id]
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({
      invoice: {
        ...invoice,
        items: JSON.parse(invoice.items_json || '[]'),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve invoice' });
  }
});

// 4. POST create invoice (Locks time logs as billed so they are not double-invoiced!)
router.post('/', async (req, res) => {
  try {
    const {
      client_id,
      invoice_number,
      issue_date,
      due_date,
      tax_rate,
      notes,
      items,
      log_ids,
    } = req.body;

    if (!client_id || !items || !items.length) {
      return res.status(400).json({ error: 'Client and billable items are required' });
    }

    const client = await db.getAsync(
      'SELECT id, name FROM clients WHERE id = ? AND user_id = ?',
      [client_id, req.user.id]
    );
    if (!client) {
      return res.status(400).json({ error: 'Invalid client' });
    }

    const generatedNumber =
      invoice_number || `INV-${Date.now().toString().slice(-6)}`;
    const finalIssueDate = issue_date || new Date().toISOString().split('T')[0];
    const finalDueDate =
      due_date ||
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const subtotal = items.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    const parsedTaxRate = tax_rate ? parseFloat(tax_rate) : 0;
    const taxAmount = (subtotal * parsedTaxRate) / 100.0;
    const totalAmount = subtotal + taxAmount;

    // Insert Invoice
    const invoiceResult = await db.runAsync(
      `
      INSERT INTO invoices (
        user_id, client_id, invoice_number, issue_date, due_date,
        subtotal, tax_rate, tax_amount, total_amount, status, notes, items_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `,
      [
        req.user.id,
        client_id,
        generatedNumber,
        finalIssueDate,
        finalDueDate,
        parseFloat(subtotal.toFixed(2)),
        parsedTaxRate,
        parseFloat(taxAmount.toFixed(2)),
        parseFloat(totalAmount.toFixed(2)),
        notes ? notes.trim() : 'Thank you for your business. Please pay within the due date.',
        JSON.stringify(items),
      ]
    );

    const invoiceId = invoiceResult.lastID;

    // Lock the time logs as billed
    const idsToLock = log_ids && log_ids.length ? log_ids : items.filter((i) => i.id).map((i) => i.id);
    if (idsToLock && idsToLock.length > 0) {
      const placeholders = idsToLock.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE time_logs SET is_billed = 1, invoice_id = ? WHERE user_id = ? AND id IN (${placeholders})`,
        [invoiceId, req.user.id, ...idsToLock]
      );
    }

    const createdInvoice = await db.getAsync('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    res.status(201).json({
      invoice: {
        ...createdInvoice,
        items: JSON.parse(createdInvoice.items_json),
      },
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// 5. PATCH invoice status (e.g. mark as 'paid' or 'pending')
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'paid', 'overdue'].includes(status)) {
      return res.status(400).json({ error: 'Invalid invoice status' });
    }

    const invoice = await db.getAsync(
      'SELECT id FROM invoices WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await db.runAsync(
      'UPDATE invoices SET status = ? WHERE id = ? AND user_id = ?',
      [status, req.params.id, req.user.id]
    );

    const updated = await db.getAsync('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ invoice: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

// 6. DELETE invoice (reverts billed time logs back to unbilled)
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await db.getAsync(
      'SELECT id FROM invoices WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Revert time logs to unbilled
    await db.runAsync(
      'UPDATE time_logs SET is_billed = 0, invoice_id = NULL WHERE invoice_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    await db.runAsync('DELETE FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Invoice deleted and time logs reverted to unbilled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// 7. GET generate professional downloadable PDF using PDFKit
router.get('/:id/pdf', async (req, res) => {
  try {
    // Phase 4 Freemium check: Pro Tier gives PDF Invoicing
    if (req.user.plan === 'free') {
      return res.status(403).json({
        error: 'PDF Invoicing is a Pro Feature. Please upgrade your account to Pro in the top right to download professional PDFs!',
        upgradeRequired: true,
      });
    }

    const invoice = await db.getAsync(
      `
      SELECT 
        i.*,
        c.name AS client_name,
        c.company AS client_company,
        c.email AS client_email,
        c.address AS client_address,
        c.phone AS client_phone,
        u.name AS user_name,
        u.email AS user_email
      FROM invoices i
      JOIN clients c ON c.id = i.client_id AND c.user_id = i.user_id
      JOIN users u ON u.id = i.user_id
      WHERE i.id = ? AND i.user_id = ?
      `,
      [req.params.id, req.user.id]
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const items = JSON.parse(invoice.items_json || '[]');

    // Initialize PDFKit document
    const doc = new PDFDocument({ margin: 45, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoice_number || 'invoice'}.pdf"`
    );

    doc.pipe(res);

    // --- Styling constants (Black, Dark Blue, Light Blue & White) ---
    const primaryColor = '#0284C7'; // Crisp Light Blue
    const secondaryColor = '#070E24'; // Deep Midnight Dark Blue
    const lightGray = '#F0F9FF'; // Light Ice Blue
    const textGray = '#475569';
    const darkNavy = '#0A1638';

    // Header Background Accent Bar
    doc.rect(0, 0, doc.page.width, 10).fill(primaryColor);

    // Top Header: Brand Name + Status Badge
    doc
      .fontSize(22)
      .fillColor(darkNavy)
      .font('Helvetica-Bold')
      .text('FREELANCEFLOW', 45, 35);

    doc
      .fontSize(9)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('Professional Freelancer Management & Billing Suite', 45, 60);

    // Invoice Title & Status
    const statusText = (invoice.status || 'PENDING').toUpperCase();
    const statusColor = invoice.status === 'paid' ? '#0284C7' : '#D97706';
    
    doc
      .fontSize(26)
      .font('Helvetica-Bold')
      .fillColor(secondaryColor)
      .text('INVOICE', 350, 35, { align: 'right' });

    doc
      .fontSize(10)
      .fillColor(statusColor)
      .font('Helvetica-Bold')
      .text(`STATUS: ${statusText}`, 350, 65, { align: 'right' });

    doc.strokeColor('#BAE6FD').lineWidth(1).moveTo(45, 85).lineTo(550, 85).stroke();

    // Details Grid (From / To / Dates)
    const topY = 100;
    
    // Billed By (Freelancer)
    doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('ISSUED BY:', 45, topY);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(secondaryColor).text(invoice.user_name || 'Freelancer', 45, topY + 16);
    doc.fontSize(9).font('Helvetica').fillColor(textGray).text(invoice.user_email || '', 45, topY + 30);
    doc.text('FreelanceFlow Verified Partner', 45, topY + 44);

    // Billed To (Client)
    doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('BILLED TO:', 220, topY);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(secondaryColor).text(invoice.client_name, 220, topY + 16);
    if (invoice.client_company) {
      doc.fontSize(9).font('Helvetica').fillColor(textGray).text(invoice.client_company, 220, topY + 30);
    }
    if (invoice.client_email) {
      doc.fontSize(9).font('Helvetica').fillColor(textGray).text(invoice.client_email, 220, topY + 44);
    }
    if (invoice.client_address) {
      doc.fontSize(9).font('Helvetica').fillColor(textGray).text(invoice.client_address, 220, topY + 58);
    }

    // Invoice Meta
    doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('INVOICE DETAILS:', 410, topY);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(secondaryColor).text(`Invoice No:`, 410, topY + 16);
    doc.font('Helvetica').fillColor(textGray).text(invoice.invoice_number, 480, topY + 16);
    doc.font('Helvetica-Bold').fillColor(secondaryColor).text(`Issue Date:`, 410, topY + 30);
    doc.font('Helvetica').fillColor(textGray).text(invoice.issue_date, 480, topY + 30);
    doc.font('Helvetica-Bold').fillColor(secondaryColor).text(`Due Date:`, 410, topY + 44);
    doc.font('Helvetica').fillColor(textGray).text(invoice.due_date, 480, topY + 44);

    // Items Table Header: Dark Navy with Crisp White Text
    const tableTop = 185;
    doc.rect(45, tableTop, 505, 24).fill(darkNavy);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    doc.text('ITEM / SERVICE', 55, tableTop + 7);
    doc.text('DATE', 255, tableTop + 7);
    doc.text('HOURS', 320, tableTop + 7, { align: 'right', width: 45 });
    doc.text('RATE', 375, tableTop + 7, { align: 'right', width: 80 });
    doc.text('AMOUNT', 460, tableTop + 7, { align: 'right', width: 85 });

    let currentY = tableTop + 26;
    doc.font('Helvetica').fontSize(9).fillColor('#334155');

    // Table rows
    items.forEach((item, index) => {
      if (currentY > 680) {
        doc.addPage();
        currentY = 50;
      }

      if (index % 2 === 1) {
        doc.rect(45, currentY - 2, 505, 22).fill('#F8FAFC');
      }

      doc.fillColor(secondaryColor).font('Helvetica-Bold');
      const title = item.project_name ? `${item.project_name} - ${item.task_title || item.description}` : item.description;
      doc.text(title.slice(0, 38), 55, currentY + 3);

      doc.font('Helvetica').fillColor(textGray);
      doc.text(item.date || '', 255, currentY + 3);
      doc.text(Number(item.hours || 0).toFixed(2), 320, currentY + 3, { align: 'right', width: 45 });
      doc.text(formatINRPdf(item.rate), 375, currentY + 3, { align: 'right', width: 80 });
      doc.fillColor(secondaryColor).font('Helvetica-Bold');
      doc.text(formatINRPdf(item.amount), 460, currentY + 3, { align: 'right', width: 85 });

      currentY += 22;
    });

    doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(45, currentY + 4).lineTo(550, currentY + 4).stroke();

    // Summary Box
    currentY += 16;
    const summaryX = 320;
    doc.font('Helvetica').fontSize(9).fillColor(textGray).text('Subtotal:', summaryX, currentY);
    doc.font('Helvetica-Bold').fillColor(secondaryColor).text(formatINRPdf(invoice.subtotal), 445, currentY, { align: 'right', width: 100 });

    currentY += 16;
    doc.font('Helvetica').fillColor(textGray).text(`Tax (${invoice.tax_rate || 0}%):`, summaryX, currentY);
    doc.font('Helvetica-Bold').fillColor(secondaryColor).text(formatINRPdf(invoice.tax_amount || 0), 445, currentY, { align: 'right', width: 100 });

    currentY += 18;
    doc.rect(summaryX - 10, currentY - 4, 240, 28).fill(primaryColor);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF').text('Total Due:', summaryX, currentY + 4);
    doc.fontSize(12).fillColor('#FFFFFF').text(formatINRPdf(invoice.total_amount), 435, currentY + 4, { align: 'right', width: 100 });

    // Notes & Payment Instructions
    currentY += 45;
    if (currentY < 720) {
      doc.rect(45, currentY, 280, 55).fill('#F8FAFC');
      doc.strokeColor('#E2E8F0').lineWidth(1).rect(45, currentY, 280, 55).stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('NOTES & PAYMENT TERMS', 55, currentY + 8);
      doc.font('Helvetica').fontSize(8).fillColor(textGray).text(
        invoice.notes || 'Payment is requested within 14 days of issue via Bank Transfer or Stripe.',
        55,
        currentY + 22,
        { width: 260 }
      );
    }

    // Footer
    doc
      .fontSize(8)
      .fillColor('#94A3B8')
      .font('Helvetica')
      .text('Generated seamlessly by FreelanceFlow - Modern SaaS for Independent Professionals.', 45, 780, {
        align: 'center',
        width: 505,
      });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF invoice' });
  }
});

module.exports = router;
