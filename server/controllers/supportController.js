const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const env = require('../config/env');
const storageProvider = require('../storage/localStorageProvider');

const TICKETS_FILE = path.join(__dirname, '../data/support_tickets.json');

// Ensure data folder exists
const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-Memory Tickets Cache
let ticketsCache = [];
try {
  if (fs.existsSync(TICKETS_FILE)) {
    const raw = fs.readFileSync(TICKETS_FILE, 'utf8');
    ticketsCache = JSON.parse(raw) || [];
  } else {
    ticketsCache = [];
    fs.writeFileSync(TICKETS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
} catch (e) {
  ticketsCache = [];
}

// Safe Disk Persistence
async function persistTickets() {
  try {
    const data = JSON.stringify(ticketsCache, null, 2);
    const temp = `${TICKETS_FILE}.tmp_${Date.now()}`;
    await fsp.writeFile(temp, data, 'utf8');
    await fsp.rename(temp, TICKETS_FILE);
  } catch (err) {
    try {
      await fsp.writeFile(TICKETS_FILE, JSON.stringify(ticketsCache, null, 2), 'utf8');
    } catch (e) {
      console.error('[Support] Error saving tickets.json:', e.message);
    }
  }
}

// Nodemailer Transporter Setup
let mailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Helper: Dispatch Email & Instant Phone Alert
async function dispatchAdminAlert(ticket) {
  const alertTitle = `🚨 Support Ticket [${ticket.ticketId}]: ${ticket.subject}`;
  let alertBody = `From: ${ticket.name} (@${ticket.username})\nCategory: ${ticket.category}\nContact: ${ticket.contactEmail || ticket.contactPhone || 'Not provided'}\n\nMessage:\n${ticket.message}`;
  if (ticket.screenshotUrl) {
    alertBody += `\n\n📸 Screenshot Attached: ${ticket.screenshotUrl}`;
  }

  // 1. Instant Phone Push Alert via ntfy.sh (Active for 9239425276)
  try {
    const cleanHeaderTitle = `Support Ticket [${ticket.ticketId}]: ${ticket.subject.replace(/[^\x20-\x7E]/g, '').trim() || 'New Issue'}`;
    const ntfyTopic = `photo_cloud_alerts_${env.ADMIN_PHONE_NUMBER}`;
    const ntfyHeaders = {
      'Title': cleanHeaderTitle,
      'Priority': 'urgent',
      'Tags': 'incoming_envelope,sos,warning'
    };
    if (ticket.screenshotUrl) {
      ntfyHeaders['Attach'] = `http://localhost:5000${ticket.screenshotUrl}`;
    }
    await fetch(`https://ntfy.sh/${ntfyTopic}`, {
      method: 'POST',
      headers: ntfyHeaders,
      body: alertBody
    });
    console.log(`[Support Alert] Dispatched instant phone push alert for Ticket ${ticket.ticketId}`);
  } catch (e) {
    console.warn('[Support Alert] ntfy dispatch note:', e.message);
  }

  // 2. Email Dispatch to pradhansoumyadip00@gmail.com
  if (mailTransporter && env.ADMIN_EMAIL) {
    try {
      const screenshotHtml = ticket.screenshotUrl ? `
        <div style="margin-top: 14px; border: 1px solid rgba(0,229,255,0.3); border-radius: 8px; overflow: hidden; background: #000; padding: 6px;">
          <p style="font-size: 12px; color: #00e5ff; margin: 4px 0;"><strong>📸 Attached Issue Screenshot:</strong></p>
          <a href="http://localhost:5000${ticket.screenshotUrl}" target="_blank" style="color:#00e5ff; font-size:12px;">View High-Res Attachment (${ticket.screenshotUrl})</a>
        </div>
      ` : '';

      await mailTransporter.sendMail({
        from: `"Photo Cloud Help Desk" <${process.env.SMTP_USER || 'support@photocloud.local'}>`,
        to: env.ADMIN_EMAIL,
        subject: `[Photo Cloud Help Desk] ${ticket.subject} (Ticket ${ticket.ticketId})`,
        text: alertBody,
        html: `
          <div style="font-family: Arial, sans-serif; background: #0c0e18; color: #fff; padding: 24px; border-radius: 12px;">
            <h2 style="color: #00e5ff; margin-top: 0;">📨 New Admin Support Request</h2>
            <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
            <p><strong>User:</strong> ${ticket.name} (@${ticket.username})</p>
            <p><strong>Category:</strong> <span style="background: rgba(124,77,255,0.3); padding: 3px 8px; border-radius: 6px;">${ticket.category}</span></p>
            <p><strong>User Contact:</strong> ${ticket.contactEmail || ticket.contactPhone || 'N/A'}</p>
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 16px 0;" />
            <p><strong>Message / Issue Description:</strong></p>
            <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 8px; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
              ${ticket.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </div>
            ${screenshotHtml}
            <p style="font-size: 11px; color: #8e9aaf; margin-top: 18px;">Private Photo Cloud Automated Dispatcher • Protected Session</p>
          </div>
        `
      });
      console.log(`[Support Email] Email successfully delivered to ${env.ADMIN_EMAIL}`);
    } catch (err) {
      console.warn('[Support Email] Note:', err.message);
    }
  } else {
    console.log(`[Support Email Simulated] Ticket logged for target: ${env.ADMIN_EMAIL}`);
  }
}

// POST /api/support/submit
const submitTicket = async (req, res) => {
  try {
    const { name, contactEmail = '', contactPhone = '', category = 'General Support', subject, message } = req.body || {};

    const cleanName = (name || '').trim() || (req.user?.displayName || req.user?.username || 'Anonymous Member');
    const cleanSubject = (subject || '').trim();
    const cleanMessage = (message || '').trim();
    const cleanCategory = (category || 'General Support').trim();
    const cleanContactEmail = (contactEmail || '').trim();
    const cleanContactPhone = (contactPhone || '').trim();

    if (!cleanSubject || !cleanMessage) {
      return res.status(400).json({
        success: false,
        error: { message: 'Subject and issue description message are required.' }
      });
    }

    // Save screenshot if provided
    let screenshotUrl = null;
    if (req.file && req.file.buffer) {
      try {
        const ext = path.extname(req.file.originalname || '.jpg').toLowerCase() || '.jpg';
        const filenameKey = `support_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
        const relPath = `originals/${filenameKey}`;
        await storageProvider.saveFile(req.file.buffer, relPath);
        screenshotUrl = `/uploads/${relPath}`;
      } catch (fileErr) {
        console.warn('[Support Screenshot Save Warning]:', fileErr.message);
      }
    }

    const ticketId = `TCK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const newTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId,
      name: cleanName,
      username: req.user?.username || cleanName,
      contactEmail: cleanContactEmail,
      contactPhone: cleanContactPhone,
      category: cleanCategory,
      subject: cleanSubject,
      message: cleanMessage,
      screenshotUrl,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    ticketsCache.unshift(newTicket);
    await persistTickets();

    // Trigger alert without blocking HTTP response
    dispatchAdminAlert(newTicket).catch(e => console.error('[Alert Err]:', e));

    return res.status(201).json({
      success: true,
      ticketId,
      screenshotUrl,
      message: `Support ticket ${ticketId} submitted successfully to Head Admin.`
    });
  } catch (err) {
    console.error('[Support Controller Error]:', err);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to submit support request. Please try again.' }
    });
  }
};

// GET /api/support/tickets (Head Admin Only)
const getTickets = async (req, res) => {
  const isHeadAdmin = (req.user?.role === 'HEAD_ADMIN' || req.user?.username?.toLowerCase() === 'soumya');
  if (!isHeadAdmin) {
    return res.status(403).json({
      success: false,
      error: { message: 'Access Denied: Only Head Admin (Soumya) can view support tickets.' }
    });
  }

  return res.json({
    success: true,
    tickets: ticketsCache
  });
};

// PATCH /api/support/tickets/:id (Head Admin Only)
const updateTicketStatus = async (req, res) => {
  const isHeadAdmin = (req.user?.role === 'HEAD_ADMIN' || req.user?.username?.toLowerCase() === 'soumya');
  if (!isHeadAdmin) {
    return res.status(403).json({
      success: false,
      error: { message: 'Access Denied: Only Head Admin (Soumya) can update ticket status.' }
    });
  }

  const { id } = req.params;
  const { status } = req.body || {};

  const ticket = ticketsCache.find(t => t.id === id || t.ticketId === id);
  if (!ticket) {
    return res.status(404).json({ success: false, error: { message: 'Ticket not found.' } });
  }

  if (status) {
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    await persistTickets();
  }

  return res.json({
    success: true,
    ticket,
    message: `Ticket status updated to ${ticket.status}.`
  });
};

module.exports = {
  submitTicket,
  getTickets,
  updateTicketStatus
};
