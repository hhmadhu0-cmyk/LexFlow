import nodemailer from "nodemailer";

// Nodemailer transporter configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail', // You can change this to your email service
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com', // Replace with your email
    pass: process.env.EMAIL_PASS || 'your-app-password' // Replace with your app password
  }
});

// Email utility functions
export async function sendEmail(to, subject, html, text = null) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Email template functions
export function generateCaseUpdateEmail(caseData, updateType, advocateName) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Case Update Notification</h2>
      <p>Dear Client,</p>
      <p>Your case has been updated by ${advocateName}.</p>

      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Case Details:</h3>
        <p><strong>Title:</strong> ${caseData.title}</p>
        <p><strong>Case ID:</strong> ${caseData.id}</p>
        <p><strong>Status:</strong> ${caseData.status}</p>
        <p><strong>Update Type:</strong> ${updateType}</p>
        ${caseData.nextHearing ? `<p><strong>Next Hearing:</strong> ${new Date(caseData.nextHearing).toLocaleDateString()}</p>` : ''}
      </div>

      <p>Please contact your advocate if you have any questions.</p>
      <p>Best regards,<br>Advocate Legal CaseBook Team</p>
    </div>
  `;
}

export function generateInvoiceEmail(invoiceData, clientData, advocateName) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Invoice Notification</h2>
      <p>Dear ${clientData.name},</p>
      <p>A new invoice has been generated for your case.</p>

      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Invoice Details:</h3>
        <p><strong>Invoice for:</strong> ${invoiceData.description || 'Legal Services'}</p>
        <p><strong>Case:</strong> ${invoiceData.case_description || 'N/A'}</p>
        <p><strong>Amount:</strong> ₹${invoiceData.amount}</p>
        <p><strong>Amount to Pay:</strong> ₹${invoiceData.amount_to_pay}</p>
        <p><strong>Status:</strong> ${invoiceData.status}</p>
        ${invoiceData.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>` : ''}
      </div>

      <p>Please ensure timely payment to avoid any delays in your case proceedings.</p>
      <p>Best regards,<br>${advocateName}<br>Advocate Legal CaseBook</p>
    </div>
  `;
}

export function generateTaskAssignmentEmail(taskData, staffData, advocateName) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Task Assignment</h2>
      <p>Dear ${staffData.name},</p>
      <p>You have been assigned a new task by ${advocateName}.</p>

      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Task Details:</h3>
        <p><strong>Title:</strong> ${taskData.title}</p>
        <p><strong>Description:</strong> ${taskData.description || 'No description provided'}</p>
        <p><strong>Client:</strong> ${taskData.client_name || 'N/A'}</p>
        <p><strong>Case:</strong> ${taskData.case_title || 'N/A'}</p>
        <p><strong>Priority:</strong> ${taskData.priority || 'Normal'}</p>
        ${taskData.start_date ? `<p><strong>Start Date:</strong> ${new Date(taskData.start_date).toLocaleDateString()}</p>` : ''}
        ${taskData.end_date ? `<p><strong>End Date:</strong> ${new Date(taskData.end_date).toLocaleDateString()}</p>` : ''}
      </div>

      <p>Please complete this task within the specified timeframe.</p>
      <p>Best regards,<br>${advocateName}<br>Advocate Legal CaseBook</p>
    </div>
  `;
}

export function generateWelcomeEmail(userData, role) {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Advocate Legal CaseBook</h2>
      <p>Dear ${userData.name},</p>
      <p>Welcome to the Advocate Legal CaseBook platform! Your ${roleDisplay} account has been successfully created.</p>

      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Account Details:</h3>
        <p><strong>Name:</strong> ${userData.name}</p>
        <p><strong>Username:</strong> ${userData.username}</p>
        <p><strong>Email:</strong> ${userData.email}</p>
        <p><strong>Role:</strong> ${roleDisplay}</p>
      </div>

      <p>You can now log in to your account and access all available features.</p>
      <p>If you have any questions, please don't hesitate to contact your advocate.</p>
      <p>Best regards,<br>Advocate Legal CaseBook Team</p>
    </div>
  `;
}
