import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import PDFDocument from "pdfkit";
import multer from "multer";
import path from "path";
import fs from "fs";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import dotenv from "dotenv";
import axios from "axios";
import summarizeRoutes from "./routes/summarize.js";
import { Document,
         Packer,
         Paragraph,
         HeadingLevel,
         TextRun
} from "docx";

// Support both `cd backend && npm start` and starting Server.js from the project root.
const envPath = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "../.env")]
  .find((candidate) => fs.existsSync(candidate));
dotenv.config(envPath ? { path: envPath } : undefined);

const app = express();
const PORT = 5000;

// Enable CORS for frontend running on different port
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());
app.get("/test", (req, res) => {
  res.send("Backend is working!");
});
app.use("/api", summarizeRoutes);

// MySQL connection pool
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'advocate_casebook',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


app.post("/api/ai-chat", async (req, res) => {

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const cleanMessages = messages
    .slice(-12)
    .filter((message) => ["user", "assistant"].includes(message?.role) && typeof message?.content === "string")
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000)
    }))
    .filter((message) => message.content.length > 0);

  if (!cleanMessages.length) {
    return res.status(400).json({ error: "Please send a message for the assistant." });
  }

  try {
    const userMessage =
      cleanMessages[cleanMessages.length - 1]?.content || "";

    const prompt = `
  You are Legal Case Book Assistant.

  Provide general legal information and help users understand legal case management.
  Do not provide definitive legal advice.
  Keep responses professional and concise.

  User: ${userMessage}
` ;

    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "llama3.2",
        prompt: prompt,
        stream: false,
      }
    );

    res.json({
      reply: response.data.response,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "The AI assistant could not respond right now.Please try again.",
    });
  }
});
  // Multer configuration for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow common file types
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images, PDFs, Word documents, and text files are allowed.'), false);
      }
    }
  });

  // Error handling middleware for multer
  const handleMulterError = (error, req, res, next) => {
    console.error('Upload error:', error);
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${error.message}`
      });
    } else if (error.message && error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    } else if (error) {
      // Handle any other upload-related errors
      return res.status(400).json({
        success: false,
        message: error.message || 'File upload failed'
      });
    }
    next();
  };

  // Removed dummy users - now using database

  // Authenticate user by role, username and password from database
  async function authenticate(role, username, password) {
    try {
      let query, table;
      if (role === 'advocate') {
        table = 'advocates';
        query = 'SELECT * FROM advocates WHERE username = ? AND password = ?';
      } else if (role === 'client') {
        table = 'clients';
        query = 'SELECT * FROM clients WHERE username = ? AND password = ?';
      } else if (role === 'staff') {
        table = 'staff';
        query = 'SELECT s.*, a.name as advocate_name FROM staff s JOIN advocates a ON s.advocate_id = a.id WHERE s.username = ? AND s.password = ?';
      } else {
        return null;
      }

      const [rows] = await pool.execute(query, [username, password]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  // Advocate login route
  app.post("/login/advocate", async (req, res) => {
    console.log("Advocate login request body:", req.body);
    const { username, password } = req.body;

    // Server-side validation
    if (!username || typeof username !== 'string' || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, message: "Invalid username format." });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const user = await authenticate("advocate", username, password);
    if (user) {
      res.json({ success: true, role: "advocate", username });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // Client login route
  app.post("/login/client", async (req, res) => {
    console.log("Client login request body:", req.body);
    const { username, password } = req.body;

    // Server-side validation
    if (!username || typeof username !== 'string' || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, message: "Invalid username format." });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const user = await authenticate("client", username, password);
    if (user) {
      res.json({ success: true, role: "client", username, clientName: user.name, clientId: user.id });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // Routes
  app.get("/cases", async (req, res) => {
    try {
      const [rows] = await pool.execute('SELECT * FROM cases');
      res.json(rows);
    } catch (error) {
      console.error('Error fetching cases:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/clients", async (req, res) => {
    try {
      const { advocate_username } = req.query;
      if (advocate_username) {
        // Get advocate ID
        const [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', [advocate_username]);
        if (advocateRows.length === 0) {
          return res.status(404).json({ error: 'Advocate not found' });
        }
        const advocateId = advocateRows[0].id;

        // Get clients directly assigned to advocate only
        const [rows] = await pool.execute(`
        SELECT c.*, a.name as advocate_name, a.username as advocate_username
        FROM clients c
        LEFT JOIN advocates a ON c.advocate_id = a.id
        WHERE c.advocate_id = ?
      `, [advocateId]);
        res.json(rows);
      } else {
        // Return all clients if no filter
        const [rows] = await pool.execute(`
        SELECT c.*, a.name as advocate_name, a.username as advocate_username
        FROM clients c
        LEFT JOIN advocates a ON c.advocate_id = a.id
      `);
        res.json(rows);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute('SELECT * FROM clients WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching client:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/invoices", async (req, res) => {
    try {
      const [rows] = await pool.execute('SELECT * FROM invoices');
      res.json(rows);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update invoice route
  app.put("/invoices/:id", async (req, res) => {
    const { id } = req.params;
    const { amount_to_pay, amount_paid, status, dueDate } = req.body;

    // Validation - check if at least one field has a meaningful value
    const hasValidUpdate = (
      (amount_to_pay !== undefined && amount_to_pay !== "" && amount_to_pay !== null) ||
      (amount_paid !== undefined && amount_paid !== "" && amount_paid !== null) ||
      (status !== undefined && status !== "" && status !== null) ||
      (dueDate !== undefined && dueDate !== "" && dueDate !== null)
    );

    if (!hasValidUpdate) {
      return res.status(400).json({ success: false, message: "At least one field to update is required." });
    }

    const invoiceId = parseInt(id, 10);
    if (isNaN(invoiceId)) {
      return res.status(400).json({ success: false, message: "Invalid invoice ID." });
    }

    try {
      // Get current invoice data
      const [currentInvoiceRows] = await pool.execute('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      if (currentInvoiceRows.length === 0) {
        return res.status(404).json({ success: false, message: "Invoice not found." });
      }
      const currentInvoice = currentInvoiceRows[0];

      // Parse and validate inputs - only if they have meaningful values
      let parsedAmountToPay = currentInvoice.amount_to_pay;
      if (amount_to_pay !== undefined && amount_to_pay !== "" && amount_to_pay !== null) {
        parsedAmountToPay = parseFloat(amount_to_pay);
        if (isNaN(parsedAmountToPay) || parsedAmountToPay < 0) {
          return res.status(400).json({ success: false, message: "Amount to pay must be a non-negative number." });
        }
      }

      let parsedAmountPaid = currentInvoice.amount_paid;
      if (amount_paid !== undefined && amount_paid !== "" && amount_paid !== null) {
        parsedAmountPaid = parseFloat(amount_paid);
        if (isNaN(parsedAmountPaid) || parsedAmountPaid < 0) {
          return res.status(400).json({ success: false, message: "Amount paid must be a non-negative number." });
        }
        if (parsedAmountPaid > parsedAmountToPay) {
          return res.status(400).json({ success: false, message: "Amount paid cannot exceed amount to pay." });
        }
      }

      if (status !== undefined && status !== "" && status !== null && !['Pending', 'Paid', 'Overdue'].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status. Must be Pending, Paid, or Overdue." });
      }

      // Recalculate remaining amount
      const newRemainingAmount = parsedAmountToPay - parsedAmountPaid;

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (amount_to_pay !== undefined && amount_to_pay !== "" && amount_to_pay !== null) {
        updateFields.push('amount_to_pay = ?');
        updateValues.push(parsedAmountToPay);
      }
      if (amount_paid !== undefined && amount_paid !== "" && amount_paid !== null) {
        updateFields.push('amount_paid = ?');
        updateValues.push(parsedAmountPaid);
      }
      if (status !== undefined && status !== "" && status !== null) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      if (dueDate !== undefined && dueDate !== "" && dueDate !== null) {
        updateFields.push('dueDate = ?');
        updateValues.push(dueDate);
      }

      updateFields.push('remaining_amount = ?');
      updateValues.push(newRemainingAmount);

      updateValues.push(invoiceId);

      const updateQuery = `UPDATE invoices SET ${updateFields.join(', ')} WHERE id = ?`;

      const [result] = await pool.execute(updateQuery, updateValues);
      // Note: affectedRows can be 0 if no actual changes were made (values unchanged)
      // Since we already verified the invoice exists, we consider this a success
      res.json({ success: true, message: "Invoice updated successfully." });
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ success: false, message: "Failed to update invoice." });
    }
  });

  // Add invoice route
  app.post("/invoices", async (req, res) => {
    console.log('Add invoice request body:', req.body);
    let { client, client_id, case_id, case_description = null, staff_handling, amount, amount_to_pay, amount_paid, status, dueDate, description } = req.body;

    // Validation
    if (!client || !amount || !amount_to_pay || !status) {
      console.log('Validation failed: missing required fields', { client: !!client, amount: !!amount, amount_to_pay: !!amount_to_pay, status: !!status });
      return res.status(400).json({ success: false, message: "Client, amount, amount to pay, and status are required." });
    }

    // Parse amounts to numbers
    const parsedAmount = parseFloat(amount);
    const parsedAmountToPay = parseFloat(amount_to_pay);
    const parsedAmountPaid = amount_paid !== undefined ? parseFloat(amount_paid) : 0;
    const parsedRemainingAmount = parsedAmountToPay - parsedAmountPaid;
    console.log('Parsed amounts:', { parsedAmount, parsedAmountToPay, parsedAmountPaid, parsedRemainingAmount });

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.log('Amount validation failed');
      return res.status(400).json({ success: false, message: "Amount must be a positive number." });
    }
    if (isNaN(parsedAmountToPay) || parsedAmountToPay <= 0) {
      console.log('Amount to pay validation failed');
      return res.status(400).json({ success: false, message: "Amount to pay must be a positive number." });
    }
    if (isNaN(parsedAmountPaid) || parsedAmountPaid < 0) {
      console.log('Amount paid validation failed');
      return res.status(400).json({ success: false, message: "Amount paid must be a non-negative number." });
    }
    if (isNaN(parsedRemainingAmount) || parsedRemainingAmount < 0) {
      console.log('Remaining amount validation failed');
      return res.status(400).json({ success: false, message: "Remaining amount must be a non-negative number." });
    }
    if (!['Pending', 'Paid', 'Overdue'].includes(status)) {
      console.log('Status validation failed');
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    try {
      // Get client_id
      if (req.body.client_id) {
        client_id = parseInt(req.body.client_id, 10);
        if (isNaN(client_id)) {
          return res.status(400).json({ success: false, message: "Invalid client ID." });
        }
        const [clientRows] = await pool.execute('SELECT id, name FROM clients WHERE id = ?', [client_id]);
        if (clientRows.length === 0) {
          return res.status(400).json({ success: false, message: "Client not found." });
        }
        client = clientRows[0].name; // Use the name from db
      } else {
        // Fallback to name lookup
        const [clientRows] = await pool.execute('SELECT id, name FROM clients WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', [client]);
        if (clientRows.length === 0) {
          return res.status(400).json({ success: false, message: "Client not found." });
        }
        client_id = clientRows[0].id;
        client = clientRows[0].name;
      }

      // Parse case_id if provided
      let parsedCaseId = null;
      if (case_id != null && case_id !== '') {
        const caseIdStr = String(case_id).trim();
        parsedCaseId = parseInt(caseIdStr, 10);
        if (isNaN(parsedCaseId)) {
          return res.status(400).json({ success: false, message: "Invalid case ID." });
        }
        // Check if case exists
        const [caseRows] = await pool.execute('SELECT id FROM cases WHERE id = ?', [parsedCaseId]);
        if (caseRows.length === 0) {
          return res.status(400).json({ success: false, message: "Case not found." });
        }
      }
      console.log('Parsed case ID:', parsedCaseId);

      // Insert invoice
      console.log('Inserting invoice with values:', [client, client_id, parsedCaseId, case_description, null, staff_handling || null, parsedAmountToPay, parsedAmountPaid, parsedRemainingAmount, description || null, parsedAmount, status, dueDate || null]);
      await pool.execute('INSERT INTO invoices (client, client_id, case_id, case_description, case_status, staff_handling, amount_to_pay, amount_paid, remaining_amount, description, amount, status, dueDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        client, client_id, parsedCaseId, case_description, null, staff_handling || null, parsedAmountToPay, parsedAmountPaid, parsedRemainingAmount, description || null, parsedAmount, status, dueDate || null
      ]);
      console.log('Invoice inserted successfully');
      res.json({ success: true, message: "Invoice added successfully." });
    } catch (error) {
      console.error('Error adding invoice:', error);
      // Provide more detailed error message
      let errorMessage = "Failed to add invoice.";
      if (error.code === 'ECONNREFUSED') {
        errorMessage = "Database connection failed. Please check if MySQL server is running.";
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = "Database table not found. Please run the database initialization script.";
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = "Database access denied. Please check database credentials.";
      } else if (error.code === 'ER_DUP_ENTRY') {
        errorMessage = "Duplicate entry. Invoice may already exist.";
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  app.get("/accounts", async (req, res) => {
    try {
      const [rows] = await pool.execute('SELECT * FROM accounts');
      res.json(rows);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Add account route
  app.post("/accounts", async (req, res) => {
    const { name, type, balance } = req.body;

    // Validation
    if (!name || !type || balance === undefined) {
      return res.status(400).json({ success: false, message: "Name, type, and balance are required." });
    }
    if (!['Trust', 'Operating', 'Client', 'Savings'].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid account type." });
    }
    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({ success: false, message: "Balance must be a non-negative number." });
    }

    try {
      // Insert account
      await pool.execute('INSERT INTO accounts (name, type, balance, lastUpdated) VALUES (?, ?, ?, CURDATE())', [name, type, balance]);
      res.json({ success: true, message: "Account added successfully." });
    } catch (error) {
      console.error('Error adding account:', error);
      res.status(500).json({ success: false, message: "Failed to add account." });
    }
  });

  // Update account route
  app.put("/accounts/:id", async (req, res) => {
    const { id } = req.params;
    const { name, type, balance } = req.body;

    // Validation
    if (!name || !type || balance === undefined) {
      return res.status(400).json({ success: false, message: "Name, type, and balance are required." });
    }
    if (!['Trust', 'Operating', 'Client', 'Savings'].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid account type." });
    }
    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({ success: false, message: "Balance must be a non-negative number." });
    }

    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      return res.status(400).json({ success: false, message: "Invalid account ID." });
    }

    try {
      // Update account
      const [result] = await pool.execute('UPDATE accounts SET name = ?, type = ?, balance = ?, lastUpdated = CURDATE() WHERE id = ?', [name, type, balance, accountId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Account not found." });
      }
      res.json({ success: true, message: "Account updated successfully." });
    } catch (error) {
      console.error('Error updating account:', error);
      res.status(500).json({ success: false, message: "Failed to update account." });
    }
  });

  // Delete account route
  app.delete("/accounts/:id", async (req, res) => {
    console.log("Delete account route called with id:", req.params.id);
    const { id } = req.params;

    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      console.log("Invalid account ID:", id);
      return res.status(400).json({ success: false, message: "Invalid account ID." });
    }

    try {
      // Delete account
      console.log("Executing delete query for account ID:", accountId);
      const [result] = await pool.execute('DELETE FROM accounts WHERE id = ?', [accountId]);
      console.log("Delete result:", result);
      if (result.affectedRows === 0) {
        console.log("Account not found for ID:", accountId);
        return res.status(404).json({ success: false, message: "Account not found." });
      }
      console.log("Account deleted successfully for ID:", accountId);
      res.json({ success: true, message: "Account deleted successfully." });
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({ success: false, message: "Failed to delete account." });
    }
  });

  app.get("/messages", async (req, res) => {
    try {
      const [rows] = await pool.execute('SELECT * FROM messages');
      res.json(rows);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/cases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute('SELECT * FROM cases WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Case not found' });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching case:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Add client route
  app.post("/clients", async (req, res) => {
    const { name, email, phone, address, username, password, advocateUsername } = req.body;

    // Validation
    if (!name || !email || !phone || !username || !password) {
      return res.status(400).json({ success: false, message: "Name, email, phone, username, and password are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, message: "Invalid username format." });
    }
    if (password.length < 6 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ success: false, message: "Invalid password format." });
    }

    try {
      // Check if username exists
      const [existing] = await pool.execute('SELECT id FROM clients WHERE username = ?', [username]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: "Username already exists." });
      }

      // Get advocate ID if advocateUsername is provided
      let advocateId = null;
      if (advocateUsername) {
        const [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', [advocateUsername]);
        if (advocateRows.length > 0) {
          advocateId = advocateRows[0].id;
        }
      }

      // Insert client
      await pool.execute('INSERT INTO clients (name, email, phone, address, username, password, advocate_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, email, phone || null, address || null, username, password, advocateId]);
      res.json({ success: true, message: "Client added successfully." });
    } catch (error) {
      console.error('Error adding client:', error);
      res.status(500).json({ success: false, message: "Failed to add client." });
    }
  });

  // Delete client route (by advocate)
  app.delete("/clients/:id", async (req, res) => {
    const { id } = req.params;
    const { advocateUsername } = req.body;

    console.log('Delete client request:', { id, advocateUsername });

    // Validation
    if (!advocateUsername) {
      console.log('Advocate username missing');
      return res.status(400).json({ success: false, message: "Advocate username is required." });
    }

    // Parse client ID
    const clientId = parseInt(id, 10);
    if (isNaN(clientId)) {
      console.log('Invalid client ID:', id);
      return res.status(400).json({ success: false, message: "Invalid client ID." });
    }

    try {
      // Verify advocate exists (for now, allow any advocate to delete clients - adjust if needed)
      const [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', [advocateUsername]);
      if (advocateRows.length === 0) {
        console.log('Advocate not found:', advocateUsername);
        return res.status(404).json({ success: false, message: "Advocate not found." });
      }
      const advocateId = advocateRows[0].id;
      console.log('Advocate ID:', advocateId);

      // Check if client exists
      const [clientRows] = await pool.execute('SELECT id, name FROM clients WHERE id = ?', [clientId]);
      if (clientRows.length === 0) {
        console.log('Client not found:', clientId);
        return res.status(404).json({ success: false, message: "Client not found." });
      }
      const clientName = clientRows[0].name;
      console.log('Client found:', { clientId, clientName });

      // Handle foreign key constraints
      // Tasks: set client_id to NULL (foreign key allows NULL)
      const [taskRows] = await pool.execute('SELECT id, title FROM tasks WHERE client_id = ?', [clientId]);
      if (taskRows.length > 0) {
        console.log('Client has associated tasks, setting client_id to NULL');
        await pool.execute('UPDATE tasks SET client_id = NULL WHERE client_id = ?', [clientId]);
      }

      // Reports will be automatically deleted due to ON DELETE CASCADE
      // Cases table uses VARCHAR client name, so no foreign key constraint to handle

      // Delete client
      const [deleteResult] = await pool.execute('DELETE FROM clients WHERE id = ?', [clientId]);
      console.log('Delete result:', deleteResult);

      if (deleteResult.affectedRows === 0) {
        console.log('No rows affected, client may not exist');
        return res.status(404).json({ success: false, message: "Client not found or already deleted." });
      }

      res.json({
        success: true,
        message: "Client deleted successfully.",
        details: {
          clientId,
          clientName,
          tasksUpdated: taskRows.length
        }
      });
    } catch (error) {
      console.error('Error deleting client:', error);
      // Provide more specific error messages based on error type
      let errorMessage = "Failed to delete client.";
      if (error.code === 'ECONNREFUSED') {
        errorMessage = "Database connection failed. Please check if MySQL server is running.";
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = "Database table not found. Please run the database initialization script.";
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = "Database access denied. Please check database credentials.";
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }

      res.status(500).json({ success: false, message: errorMessage, errorCode: error.code });
    }
  });

  // Helper function to format FIR number
  function formatFIRNumber(firNumber) {
    if (!firNumber || firNumber === '-') return null;
    // If it's already in format like "123/2024", return as is
    if (firNumber.includes('/')) return firNumber;
    // Otherwise, format as number/2024
    return `${firNumber}/2024`;
  }

  // Add case route
  app.post("/cases", async (req, res) => {
    console.log('Add case request body:', req.body);
    const {
      title,
      case_type,
      fir_number,
      court_name,
      accused_name,
      ipc_sections,
      status,
      client,
      nextHearing
    } = req.body;

    // Validation
    if (!title || !status || !client) {
      console.log('Validation failed: missing required fields', { title: !!title, status: !!status, client: !!client });
      return res.status(400).json({ success: false, message: "Title, status, and client are required." });
    }

    try {
      // Check if client exists
      console.log('Checking if client exists:', client);
      const [clientRows] = await pool.execute('SELECT id FROM clients WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', [client]);
      console.log('Client lookup result:', clientRows);
      if (clientRows.length === 0) {
        console.log('Client not found for:', client);
        return res.status(400).json({ success: false, message: "Client does not exist." });
      }

      // Format FIR number
      const formattedFIRNumber = formatFIRNumber(fir_number);

      // Insert case with only the fields that exist in the table
      console.log('Inserting case with data:', {
        title,
        case_type: case_type || null,
        fir_number: formattedFIRNumber,
        court_name: court_name || null,
        accused_name: accused_name || null,
        ipc_sections: ipc_sections || null,
        original_suit: req.body.original_suit || null,
        status,
        client,
        nextHearing: nextHearing || null
      });
      await pool.execute(`INSERT INTO cases (
      title, case_type, fir_number, court_name, accused_name,
      ipc_sections, original_suit, status, client, nextHearing
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        title,
        case_type || null,
        formattedFIRNumber,
        court_name || null,
        accused_name || null,
        ipc_sections || null,
        req.body.original_suit || null,
        status,
        client,
        nextHearing || null
      ]);
      console.log('Case inserted successfully');
      res.json({ success: true, message: "Case added successfully." });
    } catch (error) {
      console.error('Error adding case:', error);
      // Provide more detailed error message
      let errorMessage = "Failed to add case.";
      if (error.code === 'ECONNREFUSED') {
        errorMessage = "Database connection failed. Please check if MySQL server is running.";
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = "Database table not found. Please run the database initialization script.";
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = "Database access denied. Please check database credentials.";
      } else if (error.code === 'ER_DUP_ENTRY') {
        errorMessage = "Duplicate entry. Case may already exist.";
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  // Advocate registration route
  app.post("/register/advocate", async (req, res) => {
    console.log("Advocate registration request body:", req.body);
    const { username, password, name, email, phone, address } = req.body;

    // Check if all required fields are provided
    if (!username || !password || !name || !email || !phone) {
      return res.status(400).json({ success: false, message: "All required fields must be filled." });
    }

    // Server-side validation
    if (typeof username !== 'string' || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, message: "Invalid username format." });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: "Email must contain @ symbol." });
    }
    if (typeof phone !== 'string' || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits." });
    }

    try {
      // Check if username already exists
      const [existingUser] = await pool.execute('SELECT id FROM advocates WHERE username = ?', [username]);
      if (existingUser.length > 0) {
        return res.status(409).json({ success: false, message: "Username already exists." });
      }

      // Insert new advocate
      await pool.execute('INSERT INTO advocates (username, password, role, name, email, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)', [username, password, 'advocate', name, email, phone || null, address || null]);
      res.json({ success: true, message: "Advocate registered successfully." });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: "Registration failed." });
    }
  });

  // Client registration route
  app.post("/register/client", async (req, res) => {
    console.log("Client registration request body:", req.body);
    const { username, password, name, email, phone, address } = req.body;

    // Check if all required fields are provided
    if (!username || !password || !name || !email || !phone) {
      return res.status(400).json({ success: false, message: "All required fields must be filled." });
    }

    // Server-side validation
    if (typeof username !== 'string' || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, message: "Invalid username format." });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: "Email must contain @ symbol." });
    }
    if (typeof phone !== 'string' || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits." });
    }

    try {
      // Check if username already exists
      const [existingUser] = await pool.execute('SELECT id FROM clients WHERE username = ?', [username]);
      if (existingUser.length > 0) {
        return res.status(409).json({ success: false, message: "Username already exists." });
      }

      // Insert new client
      await pool.execute('INSERT INTO clients (name, email, phone, address, username, password) VALUES (?, ?, ?, ?, ?, ?)', [name, email, phone || null, address || null, username, password]);
      res.json({ success: true, message: "Client registered successfully." });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: "Registration failed." });
    }
  });

  // Staff login route
  app.post("/login/staff", async (req, res) => {
    console.log("Staff login request body:", req.body);
    const { username, password } = req.body;

    // Server-side validation
    if (!username || typeof username !== 'string' || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, message: "Invalid username format." });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const user = await authenticate("staff", username, password);
    if (user) {
      res.json({ success: true, role: "staff", username, staffName: user.name, advocateName: user.advocate_name });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // Get staff for advocate
  app.get("/staff/:advocateUsername", async (req, res) => {
    try {
      const { advocateUsername } = req.params;
      const [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', [advocateUsername]);
      if (advocateRows.length === 0) {
        return res.status(404).json({ error: 'Advocate not found' });
      }
      const advocateId = advocateRows[0].id;
      const [rows] = await pool.execute('SELECT id, name, email, phone, address, username, profile, created_at FROM staff WHERE advocate_id = ?', [advocateId]);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching staff:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get clients assigned to staff (clients that have tasks assigned to this specific staff member)
  app.get("/clients/staff/:staffUsername", async (req, res) => {
    try {
      const { staffUsername } = req.params;
      const [staffRows] = await pool.execute('SELECT id FROM staff WHERE username = ?', [staffUsername]);
      if (staffRows.length === 0) {
        return res.status(404).json({ error: 'Staff not found' });
      }
      const staffId = staffRows[0].id;

      // Get clients that have tasks assigned to this specific staff member
      // Include clients from tasks that have client_id set, and also from tasks that have case_id linking
      const [rows] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN tasks t ON t.client_id = cl.id
      WHERE t.assigned_to = ?
      UNION
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN cases c ON cl.name = c.client
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = ?
      ORDER BY name
    `, [staffId, staffId]);

      res.json(rows);
    } catch (error) {
      console.error('Error fetching staff clients:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get cases assigned to staff (cases that have tasks assigned to this staff)
  app.get("/cases/staff/:staffUsername", async (req, res) => {
    try {
      const { staffUsername } = req.params;
      const [staffRows] = await pool.execute('SELECT id FROM staff WHERE username = ?', [staffUsername]);
      if (staffRows.length === 0) {
        return res.status(404).json({ error: 'Staff not found' });
      }
      const staffId = staffRows[0].id;

      // Get cases that have tasks assigned to this staff
      const [rows] = await pool.execute(`
      SELECT DISTINCT c.* FROM cases c
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = ?
      ORDER BY c.created_at DESC
    `, [staffId]);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching staff cases:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get document counts for cases
  app.get("/cases/document-counts", async (req, res) => {
    try {
      const [rows] = await pool.execute(`
      SELECT
        case_id,
        COUNT(*) as document_count
      FROM case_files
      GROUP BY case_id
    `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching document counts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get history document counts for cases
  app.get("/cases/history-document-counts", async (req, res) => {
    try {
      const [rows] = await pool.execute(`
      SELECT
        case_id,
        COUNT(*) as history_document_count
      FROM case_history_documents
      GROUP BY case_id
    `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching history document counts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Add staff route (by advocate)
  app.post("/staff", async (req, res) => {
    const { advocateUsername, name, email, phone, address, username, password, profile } = req.body;
    console.log('Add staff request body:', req.body);
    console.log('Advocate username received:', advocateUsername);

    // Validation
    if (!advocateUsername || !name || !email || !phone || !username || !password) {
      return res.status(400).json({ success: false, message: "Advocate username, name, email, phone, username, and password are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, message: "Invalid username format." });
    }
    if (password.length < 6 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ success: false, message: "Invalid password format." });
    }

    try {
      // Get advocate ID - if not found, create a default advocate entry
      console.log('Looking up advocate:', advocateUsername);
      let [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))', [advocateUsername]);
      console.log('Advocate lookup result:', advocateRows);
      let advocateId;

      if (advocateRows.length === 0) {
        // Create a default advocate entry
        console.log('Advocate not found, creating default advocate entry for:', advocateUsername);
        const trimmedUsername = advocateUsername.trim();
        await pool.execute('INSERT INTO advocates (username, password, role, name, email, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [trimmedUsername, 'defaultpassword', 'advocate', 'Default Advocate', 'advocate@example.com', '0000000000', 'Default Address']);
        [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', [trimmedUsername]);
        advocateId = advocateRows[0].id;
      } else {
        advocateId = advocateRows[0].id;
      }

      // Check if username exists
      const [existing] = await pool.execute('SELECT id FROM staff WHERE username = ?', [username]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: "Username already exists." });
      }

      // Insert staff
      await pool.execute('INSERT INTO staff (advocate_id, name, email, phone, address, username, password, profile) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [advocateId, name, email, phone || null, address || null, username, password, profile || null]);
      res.json({ success: true, message: "Staff added successfully." });
    } catch (error) {
      console.error('Error adding staff:', error);
      res.status(500).json({ success: false, message: "Failed to add staff." });
    }
  });

  // Delete staff route (by advocate)
  app.delete("/staff/:id", async (req, res) => {
    const { id } = req.params;
    const { advocateUsername } = req.body;

    console.log('Delete staff request:', { id, advocateUsername });

    // Validation
    if (!advocateUsername) {
      console.log('Advocate username missing');
      return res.status(400).json({ success: false, message: "Advocate username is required." });
    }

    // Parse staff ID
    const staffId = parseInt(id, 10);
    if (isNaN(staffId)) {
      console.log('Invalid staff ID:', id);
      return res.status(400).json({ success: false, message: "Invalid staff ID." });
    }

    try {
      // Verify advocate owns the staff
      const [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', [advocateUsername]);
      if (advocateRows.length === 0) {
        console.log('Advocate not found:', advocateUsername);
        return res.status(404).json({ success: false, message: "Advocate not found." });
      }
      const advocateId = advocateRows[0].id;
      console.log('Advocate ID:', advocateId);

      const [staffRows] = await pool.execute('SELECT id FROM staff WHERE id = ? AND advocate_id = ?', [staffId, advocateId]);
      if (staffRows.length === 0) {
        console.log('Staff not found or not assigned to advocate:', { staffId, advocateId });
        return res.status(404).json({ success: false, message: "Staff not found or not assigned to you." });
      }
      console.log('Staff found, proceeding to delete');

      // Delete staff
      const [deleteResult] = await pool.execute('DELETE FROM staff WHERE id = ?', [staffId]);
      console.log('Delete result:', deleteResult);
      res.json({ success: true, message: "Staff deleted successfully." });
    } catch (error) {
      console.error('Error deleting staff:', error);
      res.status(500).json({ success: false, message: `Failed to delete staff: ${error.message}` });
    }
  });

  // Get tasks for advocate (all staff tasks)
  app.get("/tasks/advocate/:advocateUsername", async (req, res) => {
    try {
      const { advocateUsername } = req.params;
      const [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', [advocateUsername]);
      if (advocateRows.length === 0) {
        return res.status(404).json({ error: 'Advocate not found' });
      }
      const advocateId = advocateRows[0].id;
      const [rows] = await pool.execute(`
      SELECT t.*, s.name as staff_name, c.name as client_name, cs.title as case_title
      FROM tasks t
      JOIN staff s ON t.assigned_to = s.id
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN cases cs ON t.case_id = cs.id
      WHERE t.assigned_by = ?
      ORDER BY t.created_at DESC
    `, [advocateId]);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get tasks for staff
  app.get("/tasks/staff/:staffUsername", async (req, res) => {
    try {
      const { staffUsername } = req.params;
      const [staffRows] = await pool.execute('SELECT id FROM staff WHERE username = ?', [staffUsername]);
      if (staffRows.length === 0) {
        return res.status(404).json({ error: 'Staff not found' });
      }
      const staffId = staffRows[0].id;
      const [rows] = await pool.execute(`
      SELECT t.*, c.name as client_name, cs.title as case_title
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN cases cs ON t.case_id = cs.id
      WHERE t.assigned_to = ?
      ORDER BY t.created_at DESC
    `, [staffId]);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Assign task route
  app.post("/tasks", async (req, res) => {
    console.log("Task assignment request body:", req.body);
    const { advocateUsername, title, description, assignedTo, clientId, caseId, startDate, endDate } = req.body;

    // Validation
    if (!advocateUsername || !title || !assignedTo) {
      console.log("Validation failed: missing required fields");
      return res.status(400).json({ success: false, message: "Advocate username, title, and assigned staff are required." });
    }

    try {
      // Get advocate ID
      const [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', [advocateUsername]);
      if (advocateRows.length === 0) {
        console.log("Advocate not found:", advocateUsername);
        return res.status(400).json({ success: false, message: "Advocate not found." });
      }
      const advocateId = advocateRows[0].id;
      console.log("Advocate ID:", advocateId);

      // Parse assignedTo to integer
      const staffId = parseInt(assignedTo, 10);
      if (isNaN(staffId)) {
        console.log("Invalid staff ID:", assignedTo);
        return res.status(400).json({ success: false, message: "Invalid staff ID." });
      }
      console.log("Staff ID:", staffId);

      // Check if staff exists and belongs to advocate
      const [staffRows] = await pool.execute('SELECT id FROM staff WHERE id = ? AND advocate_id = ?', [staffId, advocateId]);
      if (staffRows.length === 0) {
        console.log("Staff not found or not assigned to advocate:", staffId, advocateId);
        return res.status(400).json({ success: false, message: "Staff not found or not assigned to this advocate." });
      }
      console.log("Staff validation passed");

      // Insert task
      const insertQuery = 'INSERT INTO tasks (title, description, assigned_to, assigned_by, client_id, case_id, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      const insertValues = [title, description || null, staffId, advocateId, clientId || null, caseId || null, startDate || null, endDate || null];
      console.log("Insert query:", insertQuery);
      console.log("Insert values:", insertValues);
      await pool.execute(insertQuery, insertValues);
      console.log("Task inserted successfully");
      res.json({ success: true, message: "Task assigned successfully." });
    } catch (error) {
      console.error('Error assigning task:', error);
      res.status(500).json({ success: false, message: "Failed to assign task." });
    }
  });

  // Update task status (by staff)
  app.put("/tasks/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status, staffUsername } = req.body;

    console.log('Update task status request:', { id, status, staffUsername });

    // Validation
    if (!status || !['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ success: false, message: "Valid status is required." });
    }

    // Parse task ID
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      console.log('Invalid task ID:', id);
      return res.status(400).json({ success: false, message: "Invalid task ID." });
    }

    try {
      // Verify staff owns the task
      const [staffRows] = await pool.execute('SELECT id FROM staff WHERE username = ?', [staffUsername]);
      if (staffRows.length === 0) {
        console.log('Staff not found:', staffUsername);
        return res.status(404).json({ success: false, message: "Staff not found." });
      }
      const staffId = staffRows[0].id;
      console.log('Staff ID:', staffId);

      const [taskRows] = await pool.execute('SELECT id FROM tasks WHERE id = ? AND assigned_to = ?', [taskId, staffId]);
      if (taskRows.length === 0) {
        console.log('Task not found or not assigned to staff:', { taskId, staffId });
        return res.status(404).json({ success: false, message: "Task not found or not assigned to you." });
      }
      console.log('Task found, updating status');

      // Update status
      const [updateResult] = await pool.execute('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);
      console.log('Update result:', updateResult);
      res.json({ success: true, message: "Task status updated successfully." });
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ success: false, message: "Failed to update task status." });
    }
  });

  // Delete task route (by advocate)
  app.delete("/tasks/:id", async (req, res) => {
    const { id } = req.params;
    const { advocateUsername } = req.body;

    console.log('Delete task request:', { id, advocateUsername });

    // Validation
    if (!advocateUsername) {
      console.log('Advocate username missing');
      return res.status(400).json({ success: false, message: "Advocate username is required." });
    }

    // Parse task ID
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      console.log('Invalid task ID:', id);
      return res.status(400).json({ success: false, message: "Invalid task ID." });
    }

    try {
      // Verify advocate owns the task
      const [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', [advocateUsername]);
      if (advocateRows.length === 0) {
        console.log('Advocate not found:', advocateUsername);
        return res.status(404).json({ success: false, message: "Advocate not found." });
      }
      const advocateId = advocateRows[0].id;
      console.log('Advocate ID:', advocateId);

      const [taskRows] = await pool.execute(`
      SELECT t.id FROM tasks t
      JOIN staff s ON t.assigned_to = s.id
      WHERE t.id = ? AND s.advocate_id = ?
    `, [taskId, advocateId]);
      if (taskRows.length === 0) {
        console.log('Task not found or not assigned to advocate\'s staff:', { taskId, advocateId });
        return res.status(404).json({ success: false, message: "Task not found or not assigned to your staff." });
      }
      console.log('Task found, proceeding to delete');

      // Delete task
      const [deleteResult] = await pool.execute('DELETE FROM tasks WHERE id = ?', [taskId]);
      console.log('Delete result:', deleteResult);
      res.json({ success: true, message: "Task deleted successfully." });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ success: false, message: `Failed to delete task: ${error.message}` });
    }
  });

  // Delete case route (by advocate)
  app.delete("/cases/:id", async (req, res) => {
    const { id } = req.params;
    const { advocateUsername } = req.body;

    console.log('Delete case request:', { id, advocateUsername });

    // Validation
    if (!advocateUsername) {
      console.log('Advocate username missing');
      return res.status(400).json({ success: false, message: "Advocate username is required." });
    }

    // Parse case ID
    const caseId = parseInt(id, 10);
    if (isNaN(caseId)) {
      console.log('Invalid case ID:', id);
      return res.status(400).json({ success: false, message: "Invalid case ID." });
    }

    try {
      // Verify advocate exists (for now, allow any advocate to delete cases - adjust if needed)
      const [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', [advocateUsername]);
      if (advocateRows.length === 0) {
        console.log('Advocate not found:', advocateUsername);
        return res.status(404).json({ success: false, message: "Advocate not found." });
      }
      const advocateId = advocateRows[0].id;
      console.log('Advocate ID:', advocateId);

      // Check if case exists
      const [caseRows] = await pool.execute('SELECT id, title FROM cases WHERE id = ?', [caseId]);
      if (caseRows.length === 0) {
        console.log('Case not found:', caseId);
        return res.status(404).json({ success: false, message: "Case not found." });
      }
      const caseTitle = caseRows[0].title;
      console.log('Case found:', { caseId, caseTitle });

      // Handle foreign key constraints
      // Tasks: set case_id to NULL (foreign key allows NULL)
      const [taskRows] = await pool.execute('SELECT id, title FROM tasks WHERE case_id = ?', [caseId]);
      if (taskRows.length > 0) {
        console.log('Case has associated tasks, setting case_id to NULL');
        await pool.execute('UPDATE tasks SET case_id = NULL WHERE case_id = ?', [caseId]);
      }

      // Delete case
      const [deleteResult] = await pool.execute('DELETE FROM cases WHERE id = ?', [caseId]);
      console.log('Delete result:', deleteResult);

      if (deleteResult.affectedRows === 0) {
        console.log('No rows affected, case may not exist');
        return res.status(404).json({ success: false, message: "Case not found or already deleted." });
      }

      res.json({
        success: true,
        message: "Case deleted successfully.",
        details: {
          caseId,
          caseTitle,
          tasksUpdated: taskRows.length
        }
      });
    } catch (error) {
      console.error('Error deleting case:', error);
      // Provide more specific error messages based on error type
      let errorMessage = "Failed to delete case.";
      if (error.code === 'ECONNREFUSED') {
        errorMessage = "Database connection failed. Please check if MySQL server is running.";
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = "Database table not found. Please run the database initialization script.";
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = "Database access denied. Please check database credentials.";
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }

      res.status(500).json({ success: false, message: errorMessage, errorCode: error.code });
    }
  });

  // Generate AI report route
  app.post("/reports/generate", async (req, res) => {
    const { clientName, reportType } = req.body;

    // Validation
    if (!clientName || !reportType) {
      return res.status(400).json({ success: false, message: "Client name and report type are required." });
    }
    if (!['case_progress', 'invoice', 'legal_opinion', 'settlement_proposal'].includes(reportType)) {
      return res.status(400).json({ success: false, message: "Invalid report type." });
    }

    try {
      // Get client ID
      const [clientRows] = await pool.execute('SELECT id FROM clients WHERE name = ?', [clientName]);
      if (clientRows.length === 0) {
        return res.status(404).json({ success: false, message: "Client not found." });
      }
      const clientId = clientRows[0].id;

      // Get relevant data based on report type
      let data = {};
      if (reportType === 'case_progress') {
        const [cases] = await pool.execute('SELECT * FROM cases WHERE client = ?', [clientName]);
        const [tasks] = await pool.execute(`
        SELECT t.*, s.name as staff_name
        FROM tasks t
        JOIN staff s ON t.assigned_to = s.id
        WHERE t.client_id = ?
      `, [clientId]);
        data = { cases, tasks };
      } else if (reportType === 'invoice') {
        const [invoices] = await pool.execute('SELECT * FROM invoices WHERE client = ?', [clientName]);
        data = { invoices };
      } else if (reportType === 'legal_opinion') {
        const [cases] = await pool.execute('SELECT * FROM cases WHERE client = ?', [clientName]);
        data = { cases };
      } else if (reportType === 'settlement_proposal') {
        const [cases] = await pool.execute('SELECT * FROM cases WHERE client = ?', [clientName]);
        data = { cases };
      }

      // Generate AI report using OpenAI
      const prompt = `Generate a professional ${reportType.replace('_', ' ')} report for client ${clientName} based on the following data: ${JSON.stringify(data)}. Make it concise, professional, and actionable.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      });

      const reportContent = completion.choices[0].message.content;

      // Save report to database
      await pool.execute('INSERT INTO reports (type, client_id, content) VALUES (?, ?, ?)', [reportType, clientId, reportContent]);

      res.json({ success: true, report: reportContent });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ success: false, message: "Failed to generate report." });
    }
  });

  // Get reports for client
  app.get("/reports/:clientName", async (req, res) => {
    const { clientName } = req.params;

    try {
      // Get client ID
      const [clientRows] = await pool.execute('SELECT id FROM clients WHERE name = ?', [clientName]);
      if (clientRows.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }
      const clientId = clientRows[0].id;

      const [rows] = await pool.execute('SELECT * FROM reports WHERE client_id = ? ORDER BY generated_at DESC', [clientId]);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Analytics endpoints
  app.get("/analytics/cases/yearly/:year", async (req, res) => {
    const { year } = req.params;

    try {
      // For demo purposes, return mock data since we don't have date fields in cases table
      // In a real implementation, you'd query based on actual date fields
      const [cases] = await pool.execute('SELECT * FROM cases');
      const [invoices] = await pool.execute('SELECT * FROM invoices');

      // Mock yearly data - in production, this would be based on actual dates
      const yearlyData = {
        year: parseInt(year),
        totalCases: cases.length,
        openCases: cases.filter(c => c.status?.toLowerCase() === 'open').length,
        closedCases: cases.filter(c => c.status?.toLowerCase() === 'closed').length,
        pendingCases: cases.filter(c => c.status?.toLowerCase() === 'pending' || c.status?.toLowerCase() === 'in progress').length,
        criminalCases: cases.filter(c => c.case_type?.toLowerCase() === 'criminal').length,
        civilCases: cases.filter(c => c.case_type?.toLowerCase() === 'civil').length,
        totalRevenue: invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0),
        totalCost: invoices.reduce((sum, inv) => sum + parseFloat(inv.amount_to_pay || 0), 0)
      };

      res.json(yearlyData);
    } catch (error) {
      console.error('Error fetching yearly analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/analytics/cases/monthly/:year", async (req, res) => {
    const { year } = req.params;

    try {
      const [cases] = await pool.execute('SELECT * FROM cases');
      const [invoices] = await pool.execute('SELECT * FROM invoices');

      // Mock monthly data - distribute cases across months for demo
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData = months.map((month, index) => {
        // Distribute cases randomly across months for demo
        const monthCases = cases.filter(() => Math.random() > 0.7);
        const monthInvoices = invoices.filter(() => Math.random() > 0.8);

        return {
          month,
          monthIndex: index,
          totalCases: monthCases.length,
          newCases: monthCases.filter(c => c.status?.toLowerCase() !== 'closed').length,
          closedCases: monthCases.filter(c => c.status?.toLowerCase() === 'closed').length,
          revenue: monthInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0),
          cost: monthInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_to_pay || 0), 0)
        };
      });

      res.json(monthlyData);
    } catch (error) {
      console.error('Error fetching monthly analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/analytics/cases/timeline/:caseId", async (req, res) => {
    const { caseId } = req.params;

    try {
      const [caseRows] = await pool.execute('SELECT * FROM cases WHERE id = ?', [caseId]);
      if (caseRows.length === 0) {
        return res.status(404).json({ error: 'Case not found' });
      }

      // Mock timeline data - in a real app, this would come from a case_history or case_stages table
      const timelineData = [
        { stage: 'Filed', date: '2024-01-15', duration: 0, status: 'completed' },
        { stage: 'Initial Hearing', date: '2024-02-01', duration: 17, status: 'completed' },
        { stage: 'Evidence Collection', date: '2024-02-15', duration: 14, status: 'completed' },
        { stage: 'Witness Examination', date: '2024-03-01', duration: 14, status: 'in_progress' },
        { stage: 'Final Arguments', date: '2024-03-15', duration: 14, status: 'pending' },
        { stage: 'Judgment', date: '2024-04-01', duration: 17, status: 'pending' }
      ];

      res.json(timelineData);
    } catch (error) {
      console.error('Error fetching case timeline:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Analytics endpoints
  app.get("/analytics/cases/yearly", async (req, res) => {
    try {
      const [rows] = await pool.execute(`
      SELECT
        COUNT(*) as total_cases,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed_cases,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open_cases,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_cases,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_cases
      FROM cases
    `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching yearly case analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/analytics/cases/monthly", async (req, res) => {
    try {
      const [rows] = await pool.execute(`
      SELECT
        YEAR(COALESCE(created_at, CURDATE())) as year,
        MONTH(COALESCE(created_at, CURDATE())) as month,
        COUNT(*) as total_cases,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed_cases,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open_cases,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_cases,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_cases
      FROM cases
      GROUP BY YEAR(COALESCE(created_at, CURDATE())), MONTH(COALESCE(created_at, CURDATE()))
      ORDER BY year DESC, month DESC
    `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching monthly case analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/analytics/cases/timeline/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [caseRows] = await pool.execute('SELECT * FROM cases WHERE id = ?', [id]);
      if (caseRows.length === 0) {
        return res.status(404).json({ error: 'Case not found' });
      }

      const caseData = caseRows[0];

      // Get related invoices for cost analysis
      const [invoiceRows] = await pool.execute('SELECT * FROM invoices WHERE case_id = ?', [id]);

      // Calculate time spent in each stage (simplified - using status changes)
      const timeline = {
        case_id: id,
        title: caseData.title,
        status: caseData.status,
        created_at: caseData.created_at,
        updated_at: caseData.updated_at,
        total_invoices: invoiceRows.length,
        total_amount: invoiceRows.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0),
        pending_amount: invoiceRows
          .filter(inv => inv.status === 'Pending')
          .reduce((sum, inv) => sum + parseFloat(inv.amount_to_pay || 0), 0),
        paid_amount: invoiceRows
          .filter(inv => inv.status === 'Paid')
          .reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0),
        invoices: invoiceRows
      };

      res.json(timeline);
    } catch (error) {
      console.error('Error fetching case timeline:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/analytics/cases/cost-outcome", async (req, res) => {
    try {
      const [rows] = await pool.execute(`
      SELECT
        c.id,
        c.title,
        c.status,
        c.case_type,
        c.created_at,
        COALESCE(SUM(i.amount), 0) as total_cost,
        COALESCE(SUM(CASE WHEN i.status = 'Paid' THEN i.amount ELSE 0 END), 0) as paid_cost,
        COALESCE(SUM(CASE WHEN i.status = 'Pending' THEN i.amount_to_pay ELSE 0 END), 0) as pending_cost,
        COUNT(i.id) as invoice_count,
        DATEDIFF(CURDATE(), COALESCE(c.created_at, CURDATE())) as days_open
      FROM cases c
      LEFT JOIN invoices i ON c.id = i.case_id
      GROUP BY c.id, c.title, c.status, c.case_type, c.created_at
      ORDER BY c.created_at DESC
    `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching cost-outcome analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update case route (with history logging)
  app.put("/cases/:id", async (req, res) => {
    const { id } = req.params;
    const { title, case_type, fir_number, court_name, accused_name, ipc_sections, status, client, nextHearing } = req.body;

    // Validation
    if (!title || !status || !client) {
      return res.status(400).json({ success: false, message: "Title, status, and client are required." });
    }

    const caseId = parseInt(id, 10);
    if (isNaN(caseId)) {
      return res.status(400).json({ success: false, message: "Invalid case ID." });
    }

    try {
      // Get current case data for comparison
      const [currentCaseRows] = await pool.execute('SELECT * FROM cases WHERE id = ?', [caseId]);
      if (currentCaseRows.length === 0) {
        return res.status(404).json({ success: false, message: "Case not found." });
      }
      const currentCase = currentCaseRows[0];

      // Update case
      await pool.execute(`UPDATE cases SET
      title = ?, case_type = ?, fir_number = ?, court_name = ?, accused_name = ?,
      ipc_sections = ?, status = ?, client = ?, nextHearing = ?
      WHERE id = ?`, [
        title,
        case_type || null,
        fir_number || null,
        court_name || null,
        accused_name || null,
        ipc_sections || null,
        status,
        client,
        nextHearing || null,
        caseId
      ]);

      // Log changes to case_history
      const fieldsToCheck = ['title', 'case_type', 'fir_number', 'court_name', 'accused_name', 'ipc_sections', 'status', 'client', 'nextHearing'];
      for (const field of fieldsToCheck) {
        const oldValue = currentCase[field];
        const newValue = req.body[field];
        if (oldValue !== newValue && (oldValue !== null || newValue !== null)) {
          await pool.execute(
            'INSERT INTO case_history (case_id, change_type, field_name, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?, ?)',
            [caseId, 'update', field, oldValue || null, newValue || null, 'System']
          );
        }
      }

      res.json({ success: true, message: "Case updated successfully." });
    } catch (error) {
      console.error('Error updating case:', error);
      res.status(500).json({ success: false, message: "Failed to update case." });
    }
  });

  // Case History endpoints

  // Get case history for a specific case
  app.get("/cases/:id/history", async (req, res) => {
    try {
      const { id } = req.params;
      const [historyRows] = await pool.execute(
        'SELECT * FROM case_history WHERE case_id = ? ORDER BY changed_at DESC',
        [id]
      );
      res.json(historyRows);
    } catch (error) {
      console.error('Error fetching case history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Add a manual history entry
  app.post("/cases/:id/history", async (req, res) => {
    const { id } = req.params;
    const { change_type, field_name, old_value, new_value, changed_by, notes } = req.body;

    // Validation
    if (!change_type) {
      return res.status(400).json({ success: false, message: "Change type is required." });
    }

    try {
      // Verify case exists
      const [caseRows] = await pool.execute('SELECT id FROM cases WHERE id = ?', [id]);
      if (caseRows.length === 0) {
        return res.status(404).json({ success: false, message: "Case not found." });
      }

      // Insert history entry
      await pool.execute(
        'INSERT INTO case_history (case_id, change_type, field_name, old_value, new_value, changed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, change_type, field_name || null, old_value || null, new_value || null, changed_by || 'System', notes || null]
      );

      res.json({ success: true, message: "History entry added successfully." });
    } catch (error) {
      console.error('Error adding history entry:', error);
      res.status(500).json({ success: false, message: "Failed to add history entry." });
    }
  });

  // Generate PDF report for case history
  app.get("/cases/:id/history/pdf", async (req, res) => {
    try {
      const { id } = req.params;

      // Get case details
      const [caseRows] = await pool.execute('SELECT * FROM cases WHERE id = ?', [id]);
      if (caseRows.length === 0) {
        return res.status(404).json({ error: 'Case not found' });
      }
      const caseData = caseRows[0];

      // Get case history
      const [historyRows] = await pool.execute(
        'SELECT * FROM case_history WHERE case_id = ? ORDER BY changed_at DESC',
        [id]
      );

      // Create PDF document
      const doc = new PDFDocument();
      const filename = `case_${id}_history_report.pdf`;

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Pipe PDF to response
      doc.pipe(res);

      // Add title
      doc.fontSize(20).text('Case History Report', { align: 'center' });
      doc.moveDown();

      // Case information
      doc.fontSize(14).text('Case Information:');
      doc.fontSize(12);
      doc.text(`Case ID: ${caseData.id}`);
      doc.text(`Title: ${caseData.title}`);
      doc.text(`Client: ${caseData.client}`);
      doc.text(`Status: ${caseData.status}`);
      doc.text(`Case Type: ${caseData.case_type || 'Not specified'}`);
      if (caseData.fir_number) doc.text(`FIR Number: ${caseData.fir_number}`);
      if (caseData.court_name) doc.text(`Court Name: ${caseData.court_name}`);
      if (caseData.accused_name) doc.text(`Accused Name: ${caseData.accused_name}`);
      if (caseData.ipc_sections) doc.text(`IPC Sections: ${caseData.ipc_sections}`);
      doc.text(`Created: ${new Date(caseData.created_at).toLocaleDateString()}`);
      doc.moveDown();

      // History section
      doc.fontSize(14).text('Case History:');
      doc.moveDown();

      if (historyRows.length === 0) {
        doc.fontSize(12).text('No history entries found for this case.');
      } else {
        historyRows.forEach((entry, index) => {
          doc.fontSize(12);
          doc.text(`${index + 1}. ${entry.change_type.toUpperCase()}`, { underline: true });
          doc.fontSize(10);
          doc.text(`Date: ${new Date(entry.changed_at).toLocaleString()}`);
          if (entry.field_name) doc.text(`Field: ${entry.field_name}`);
          if (entry.old_value) doc.text(`Old Value: ${entry.old_value}`);
          if (entry.new_value) doc.text(`New Value: ${entry.new_value}`);
          if (entry.changed_by) doc.text(`Changed By: ${entry.changed_by}`);
          if (entry.notes) doc.text(`Notes: ${entry.notes}`);
          doc.moveDown(0.5);
        });
      }

      // Footer
      doc.moveDown();
      doc.fontSize(10).text(`Report generated on ${new Date().toLocaleString()}`, { align: 'center' });

      // Finalize PDF
      doc.end();

    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // File upload endpoints

  // Upload single file
  app.post('/upload', upload.single('file'), handleMulterError, (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }

      const fileData = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploaded_at: new Date()
      };

      res.json({
        success: true,
        message: 'File uploaded successfully.',
        file: fileData
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ success: false, message: 'Failed to upload file.' });
    }
  });

  // Upload multiple files
  app.post('/upload/multiple', upload.array('files', 10), handleMulterError, (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded.' });
      }

      const filesData = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        uploaded_at: new Date()
      }));

      res.json({
        success: true,
        message: `${req.files.length} files uploaded successfully.`,
        files: filesData
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ success: false, message: 'Failed to upload files.' });
    }
  });

  // Get uploaded files list
  app.get('/uploads', async (req, res) => {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        return res.json({ files: [] });
      }

      const files = fs.readdirSync(uploadDir).map(filename => {
        const filePath = path.join(uploadDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          uploaded_at: stats.mtime,
          path: filePath
        };
      });

      res.json({ files });
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      res.status(500).json({ error: 'Failed to fetch uploaded files.' });
    }
  });

  // Download file
  app.get('/uploads/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), 'uploads', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found.' });
      }

      res.download(filePath);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Failed to download file.' });
    }
  });

  // Delete uploaded file
  app.delete('/uploads/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), 'uploads', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found.' });
      }

      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'File deleted successfully.' });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ success: false, message: 'Failed to delete file.' });
    }
  });

  // Case file upload endpoints

  // Upload files for a specific case
  app.post('/cases/:id/files', upload.array('files', 10), handleMulterError, async (req, res) => {
    try {
      const { id } = req.params;
      const { uploadedBy } = req.body; // username of uploader

      console.log('File upload request for case:', id, 'Files received:', req.files ? req.files.length : 0);

      if (!req.files || req.files.length === 0) {
        console.log('No files in request');
        return res.status(400).json({ success: false, message: 'No files uploaded.' });
      }

      // Parse case ID to integer
      const caseId = parseInt(id, 10);
      if (isNaN(caseId)) {
        console.log('Invalid case ID:', id);
        return res.status(400).json({ success: false, message: 'Invalid case ID.' });
      }

      // Verify case exists
      const [caseRows] = await pool.execute('SELECT id FROM cases WHERE id = ?', [caseId]);
      console.log('Case lookup result:', caseRows.length, 'rows found');
      if (caseRows.length === 0) {
        console.log('Case not found for ID:', caseId);
        return res.status(404).json({ success: false, message: 'Case not found.' });
      }

      const uploadedFiles = [];

      for (const file of req.files) {
        console.log('Processing file:', file.originalname, 'Size:', file.size, 'Type:', file.mimetype);

        try {
          // Insert file record into database
          const [result] = await pool.execute(
            'INSERT INTO case_files (case_id, filename, original_name, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [caseId, file.filename, file.originalname, file.path, file.size, file.mimetype, uploadedBy || 'System']
          );

          console.log('File inserted with ID:', result.insertId);

          uploadedFiles.push({
            id: result.insertId,
            filename: file.filename,
            original_name: file.originalname,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date()
          });
        } catch (dbError) {
          console.error('Database insertion error for file:', file.originalname, dbError);
          throw dbError; // Re-throw to be caught by outer try-catch
        }
      }

      console.log('Upload successful, files uploaded:', uploadedFiles.length);

      res.json({
        success: true,
        message: `${req.files.length} file(s) uploaded successfully for case ${caseId}.`,
        files: uploadedFiles
      });
    } catch (error) {
      console.error('Error uploading case files:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });

      // Provide more specific error messages
      let errorMessage = 'Failed to upload case files.';
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Database connection failed. Please check if MySQL server is running.';
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = 'Database table not found. Please run the database initialization script.';
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = 'Database access denied. Please check database credentials.';
      } else if (error.code === 'ER_DUP_ENTRY') {
        errorMessage = 'Duplicate entry. File may already exist.';
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        errorCode: error.code,
        details: error.message
      });
    }
  });

  // Get files for a specific case
  app.get('/cases/:id/files', async (req, res) => {
    try {
      const { id } = req.params;

      // Verify case exists
      const [caseRows] = await pool.execute('SELECT id FROM cases WHERE id = ?', [id]);
      if (caseRows.length === 0) {
        return res.status(404).json({ error: 'Case not found' });
      }

      const [files] = await pool.execute(
        'SELECT id, filename, original_name, file_size, mime_type, uploaded_by, uploaded_at FROM case_files WHERE case_id = ? ORDER BY uploaded_at DESC',
        [id]
      );

      res.json({ files });
    } catch (error) {
      console.error('Error fetching case files:', error);
      res.status(500).json({ error: 'Failed to fetch case files.' });
    }
  });

  // Download a specific case file
  app.get('/files/:id/download', async (req, res) => {
    try {
      const { id } = req.params;

      // Get file info from database
      const [fileRows] = await pool.execute(
        'SELECT filename, original_name, file_path FROM case_files WHERE id = ?',
        [id]
      );

      if (fileRows.length === 0) {
        return res.status(404).json({ error: 'File not found.' });
      }

      const file = fileRows[0];
      const filePath = file.file_path;

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on server.' });
      }

      // Set headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Failed to download file.' });
    }
  });

  // Delete a specific case file
  app.delete('/files/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Get file info from database
      const [fileRows] = await pool.execute(
        'SELECT filename, file_path FROM case_files WHERE id = ?',
        [id]
      );

      if (fileRows.length === 0) {
        return res.status(404).json({ success: false, message: 'File not found.' });
      }

      const file = fileRows[0];

      // Delete file from filesystem
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }

      // Delete record from database
      await pool.execute('DELETE FROM case_files WHERE id = ?', [id]);

      res.json({ success: true, message: 'File deleted successfully.' });
    } catch (error) {
      console.error('Error deleting case file:', error);
      res.status(500).json({ success: false, message: 'Failed to delete file.' });
    }
  });

  // Case History Documents endpoints

  // Upload case history documents
  app.post('/cases/:id/history/documents', upload.array('files', 10), handleMulterError, async (req, res) => {
    try {
      const { id } = req.params;
      const { uploadedBy } = req.body; // username of uploader

      console.log('POST /cases/:id/history/documents - Case ID:', id);
      console.log('Uploaded by:', uploadedBy);
      console.log('Files received:', req.files ? req.files.length : 0);
      console.log('Request headers:', JSON.stringify(req.headers, null, 2));

      if (!req.files || req.files.length === 0) {
        console.log('No files uploaded');
        return res.status(400).json({ success: false, message: 'No files uploaded.' });
      }

      // Parse case ID to integer
      const caseId = parseInt(id, 10);
      if (isNaN(caseId)) {
        console.log('Invalid case ID:', id);
        return res.status(400).json({ success: false, message: 'Invalid case ID.' });
      }

      console.log('Parsed case ID:', caseId);

      // Verify case exists
      const [caseRows] = await pool.execute('SELECT id FROM cases WHERE id = ?', [caseId]);
      console.log('Case lookup result:', caseRows.length, 'rows found');
      if (caseRows.length === 0) {
        console.log('Case not found for ID:', caseId);
        return res.status(404).json({ success: false, message: 'Case not found.' });
      }

      const uploadedDocuments = [];

      for (const file of req.files) {
        console.log('Processing file:', file.originalname, 'Size:', file.size, 'Type:', file.mimetype);
        console.log('File path:', file.path);
        console.log('File destination:', file.destination);

        try {
          // Insert document record into database
          const [result] = await pool.execute(
            'INSERT INTO case_history_documents (case_id, filename, original_name, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [caseId, file.filename, file.originalname, file.path, file.size, file.mimetype, uploadedBy || 'System']
          );

          console.log('Document inserted with ID:', result.insertId);

          uploadedDocuments.push({
            id: result.insertId,
            filename: file.filename,
            original_name: file.originalname,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date()
          });
        } catch (dbError) {
          console.error('Database insertion error for file:', file.originalname, dbError);
          throw dbError; // Re-throw to be caught by outer try-catch
        }
      }

      console.log('Upload successful, documents uploaded:', uploadedDocuments.length);

      res.json({
        success: true,
        message: `${req.files.length} document(s) uploaded successfully for case ${caseId} history.`,
        documents: uploadedDocuments
      });
    } catch (error) {
      console.error('Error uploading case history documents:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });

      // Provide more specific error messages
      let errorMessage = 'Failed to upload case history documents.';
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Database connection failed. Please check if MySQL server is running.';
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = 'Database table not found. Please run the database initialization script.';
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = 'Database access denied. Please check database credentials.';
      } else if (error.code === 'ER_DUP_ENTRY') {
        errorMessage = 'Duplicate entry. Document may already exist.';
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        errorCode: error.code,
        details: error.message
      });
    }
  });

  // Get case history documents for a specific case
  app.get('/cases/:id/history/documents', async (req, res) => {
    try {
      const { id } = req.params;

      // Verify case exists
      const [caseRows] = await pool.execute('SELECT id FROM cases WHERE id = ?', [id]);
      if (caseRows.length === 0) {
        return res.status(404).json({ error: 'Case not found' });
      }

      const [documents] = await pool.execute(
        'SELECT id, filename, original_name, file_size, mime_type, uploaded_by, uploaded_at FROM case_history_documents WHERE case_id = ? ORDER BY uploaded_at DESC',
        [id]
      );

      res.json({ documents });
    } catch (error) {
      console.error('Error fetching case history documents:', error);
      res.status(500).json({ error: 'Failed to fetch case history documents.' });
    }
  });



  // Download a specific case history document (with case ID validation)
  app.get('/cases/:caseId/history/documents/:documentId/download', async (req, res) => {
    try {
      const { caseId, documentId } = req.params;

      // Get document info from database with case validation
      const [documentRows] = await pool.execute(
        'SELECT filename, original_name, file_path, mime_type FROM case_history_documents WHERE id = ? AND case_id = ?',
        [documentId, caseId]
      );

      if (documentRows.length === 0) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const document = documentRows[0];
      const filePath = document.file_path;

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Document not found on server.' });
      }

      // Set headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
      res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading history document:', error);
      res.status(500).json({ error: 'Failed to download document.' });
    }
  });

  // Download a specific case history document (legacy endpoint for backward compatibility)
  app.get('/history/documents/:id/download', async (req, res) => {
    try {
      const { id } = req.params;

      // Get document info from database
      const [documentRows] = await pool.execute(
        'SELECT filename, original_name, file_path, mime_type FROM case_history_documents WHERE id = ?',
        [id]
      );

      if (documentRows.length === 0) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const document = documentRows[0];
      const filePath = document.file_path;

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Document not found on server.' });
      }

      // Set headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
      res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading history document:', error);
      res.status(500).json({ error: 'Failed to download document.' });
    }
  });

  // Delete a specific case history document
  app.delete('/history/documents/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Get document info from database
      const [documentRows] = await pool.execute(
        'SELECT filename, file_path FROM case_history_documents WHERE id = ?',
        [id]
      );

      if (documentRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Document not found.' });
      }

      const document = documentRows[0];

      // Delete file from filesystem
      if (fs.existsSync(document.file_path)) {
        fs.unlinkSync(document.file_path);
      }

      // Delete record from database
      await pool.execute('DELETE FROM case_history_documents WHERE id = ?', [id]);

      res.json({ success: true, message: 'History document deleted successfully.' });
    } catch (error) {
      console.error('Error deleting history document:', error);
      res.status(500).json({ success: false, message: 'Failed to delete document.' });
    }
  });

  // Upload document for multiple similar cases (same case type but different clients)
  app.post('/cases/upload-shared-document', upload.array('files', 10), handleMulterError, async (req, res) => {
    try {
      const { caseIds, uploadedBy, documentType } = req.body; // caseIds should be a JSON string array

      console.log('Shared document upload request:', { caseIds, uploadedBy, documentType });
      console.log('Files received:', req.files ? req.files.length : 0);

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded.' });
      }

      if (!caseIds) {
        return res.status(400).json({ success: false, message: 'Case IDs are required.' });
      }

      let parsedCaseIds;
      try {
        parsedCaseIds = JSON.parse(caseIds);
        if (!Array.isArray(parsedCaseIds) || parsedCaseIds.length === 0) {
          return res.status(400).json({ success: false, message: 'Case IDs must be a non-empty array.' });
        }
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid case IDs format.' });
      }

      // Verify all cases exist and get their details
      const caseDetails = [];
      for (const caseId of parsedCaseIds) {
        const parsedId = parseInt(caseId, 10);
        if (isNaN(parsedId)) {
          return res.status(400).json({ success: false, message: `Invalid case ID: ${caseId}` });
        }

        const [caseRows] = await pool.execute('SELECT id, title, client, case_type FROM cases WHERE id = ?', [parsedId]);
        if (caseRows.length === 0) {
          return res.status(404).json({ success: false, message: `Case not found: ${caseId}` });
        }
        caseDetails.push(caseRows[0]);
      }

      console.log('Verified cases:', caseDetails.map(c => ({ id: c.id, title: c.title, client: c.client })));

      const uploadedDocuments = [];

      for (const file of req.files) {
        console.log('Processing shared file:', file.originalname, 'Size:', file.size, 'Type:', file.mimetype);

        // Upload the file once and create records for each case
        for (const caseDetail of caseDetails) {
          try {
            // Insert document record into database for each case
            const [result] = await pool.execute(
              'INSERT INTO case_history_documents (case_id, filename, original_name, file_path, file_size, mime_type, uploaded_by, document_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [caseDetail.id, file.filename, file.originalname, file.path, file.size, file.mimetype, uploadedBy || 'System', documentType || 'shared', `Shared document for similar case: ${caseDetail.title} (${caseDetail.client})`]
            );

            console.log('Shared document inserted for case', caseDetail.id, 'with ID:', result.insertId);

            uploadedDocuments.push({
              id: result.insertId,
              case_id: caseDetail.id,
              case_title: caseDetail.title,
              client: caseDetail.client,
              filename: file.filename,
              original_name: file.originalname,
              file_size: file.size,
              mime_type: file.mimetype,
              document_type: documentType || 'shared',
              uploaded_at: new Date()
            });
          } catch (dbError) {
            console.error('Database insertion error for shared file:', file.originalname, 'Case:', caseDetail.id, dbError);
            throw dbError;
          }
        }
      }

      console.log('Shared upload successful, documents uploaded:', uploadedDocuments.length);

      res.json({
        success: true,
        message: `Document(s) uploaded successfully for ${parsedCaseIds.length} similar cases.`,
        cases: caseDetails.map(c => ({ id: c.id, title: c.title, client: c.client, case_type: c.case_type })),
        documents: uploadedDocuments
      });
    } catch (error) {
      console.error('Error uploading shared document:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });

      let errorMessage = 'Failed to upload shared document.';
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Database connection failed. Please check if MySQL server is running.';
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = 'Database table not found. Please run the database initialization script.';
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = 'Database access denied. Please check database credentials.';
      } else if (error.code === 'ER_DUP_ENTRY') {
        errorMessage = 'Duplicate entry. Document may already exist.';
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        errorCode: error.code,
        details: error.message
      });
    }
  });

  // Helper function to log case changes
  async function logCaseChange(caseId, changeType, fieldName, oldValue, newValue, changedBy = 'System', notes = null) {
    try {
      await pool.execute(
        'INSERT INTO case_history (case_id, change_type, field_name, old_value, new_value, changed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [caseId, changeType, fieldName, oldValue, newValue, changedBy, notes]
      );
    } catch (error) {
      console.error('Error logging case change:', error);
    }
  }

  // Global error handler for unhandled errors
  app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  });
   app.post("/api/court-proceedings", async (req, res) => {
  try {
    const { case_id, title, transcript, ai_summary } = req.body;

    // Save to MySQL
    await pool.query(
      `INSERT INTO court_proceedings (case_id, title, transcript, ai_summary)
       VALUES (?, ?, ?, ?)`,
      [case_id, title, transcript, ai_summary]
    );

    // Create Word document
    const doc = new Document({
      sections: [
        {
          children: [

new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [
        new TextRun({
            text: "LEXFLOW WITH AI",
            bold: true
        })
    ]
}),

new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [
        new TextRun("Court Proceedings Report")
    ]
}),

new Paragraph(""),

new Paragraph({
    children: [
        new TextRun({
            text: "Case ID : ",
            bold: true
        }),
        new TextRun(String(case_id))
    ]
}),

new Paragraph({
    children: [
        new TextRun({
            text: "Title : ",
            bold: true
        }),
        new TextRun(title)
    ]
}),

new Paragraph({
    children: [
        new TextRun({
            text: "Generated On : ",
            bold: true
        }),
        new TextRun(new Date().toLocaleString())
    ]
}),

new Paragraph("------------------------------------------------"),

new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [
        new TextRun("COURT TRANSCRIPT")
    ]
}),

new Paragraph(""),

new Paragraph(transcript),

new Paragraph(""),

new Paragraph("------------------------------------------------"),

new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [
        new TextRun("AI SUMMARY")
    ]
}),

...(ai_summary
    ? ai_summary.split("\n").map(
        line =>
            new Paragraph({
                children: [
                    new TextRun(line)
                ]
            })
    )
    : [
        new Paragraph("No AI summary generated.")
    ]),

new Paragraph(""),

new Paragraph("------------------------------------------------"),

new Paragraph({
    children: [
        new TextRun({
            text: "Generated by LexFlow with AI",
            italics: true
        })
    ]
})

]
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const fileName = `Case_${case_id}_${Date.now()}.docx`;

    fs.writeFileSync(
      path.join("transcripts", fileName),
      buffer
    );
    // Create PDF
const pdfFileName = `Case_${case_id}_${Date.now()}.pdf`;

const pdf = new PDFDocument({
  margin: 50,
});

pdf.pipe(
  fs.createWriteStream(
    path.join("transcripts", pdfFileName)
  )
);

pdf.fontSize(22).text("LEXFLOW WITH AI", {
  align: "center",
});

pdf.moveDown();

pdf.fontSize(18).text("Court Proceedings Report", {
  align: "center",
});

pdf.moveDown();

pdf.fontSize(12).text(`Case ID : ${case_id}`);
pdf.text(`Title : ${title}`);
pdf.text(`Generated On : ${new Date().toLocaleString()}`);

pdf.moveDown();

pdf.fontSize(16).text("COURT TRANSCRIPT");

pdf.moveDown();

pdf.fontSize(12).text(transcript);

pdf.moveDown();

pdf.fontSize(16).text("AI SUMMARY");

pdf.moveDown();

pdf.fontSize(12).text(ai_summary || "No AI Summary");

pdf.moveDown();

pdf.text("--------------------------------------------");

pdf.moveDown();

pdf.fontSize(10).text("Generated by LexFlow with AI", {
  align: "center",
});

pdf.end();

    res.json({
      success: true,
      message: "Transcript saved successfully!",
      pdf: pdfFileName,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
app.get("/api/cases", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title FROM cases ORDER BY id"
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch cases" });
  }
});
  // Handle 404 errors
  app.use((req, res) => {
    console.log('404 Not Found:', req.method, req.url);
    res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
