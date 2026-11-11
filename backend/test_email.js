import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Test email function
async function testEmail() {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: 'test@example.com', // Replace with your test email
      subject: 'Test Email from Advocate Legal CaseBook',
      html: '<h1>Test Email</h1><p>This is a test email to verify nodemailer setup.</p>'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending test email:', error);
    return { success: false, error: error.message };
  }
}

// Run test
testEmail().then(result => {
  console.log('Test result:', result);
  process.exit(result.success ? 0 : 1);
});
