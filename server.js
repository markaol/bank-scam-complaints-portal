const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const COMPLAINTS_FILE = path.join(DATA_DIR, "complaints.json");

const defaultUsers = {
  "Emma Johnson": "bank123",
  "Daniel Moore": "bank123",
  "Sophia Patel": "bank123",
  "Marcus Green": "bank123",
  "Olivia Davis": "bank123"
};

const defaultComplaints = [
  {
    caseId: "USB-2026-0001",
    complainantName: "Alice Carter",
    bankName: "Chase",
    bankAccount: "Checking",
    complaintType: "Phishing Scam",
    amountLost: 2450,
    incidentDate: "2026-09-18",
    assignedAgent: "Emma Johnson",
    priority: "High",
    complaintDetails: "Customer reported receiving a fake email urging a password reset and transfer of funds.",
    createdAt: "2026-09-18T10:00:00.000Z",
    status: "In Review"
  },
  {
    caseId: "USB-2026-0002",
    complainantName: "Michael Wu",
    bankName: "Bank of America",
    bankAccount: "Credit Card",
    complaintType: "Unauthorized Transaction",
    amountLost: 870,
    incidentDate: "2026-09-21",
    assignedAgent: "Daniel Moore",
    priority: "Medium",
    complaintDetails: "Several unauthorized charges were posted to the customer's card in the last 72 hours.",
    createdAt: "2026-09-21T14:30:00.000Z",
    status: "New"
  },
  {
    caseId: "USB-2026-0003",
    complainantName: "Rachel Simmons",
    bankName: "Wells Fargo",
    bankAccount: "Savings",
    complaintType: "Wire Fraud",
    amountLost: 12300,
    incidentDate: "2026-10-02",
    assignedAgent: "Sophia Patel",
    priority: "Critical",
    complaintDetails: "Fraudulent bank transfer completed after a spoofed call impersonating the branch manager.",
    createdAt: "2026-10-02T12:15:00.000Z",
    status: "Pending"
  }
];

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
  }

  if (!fs.existsSync(COMPLAINTS_FILE)) {
    fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(defaultComplaints, null, 2));
  }
}

function readJson(file, fallback) {
  try {
    const content = fs.readFileSync(file, "utf8");
    return JSON.parse(content);
  } catch (error) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function generateCaseId(existingCases = []) {
  let highest = 0;

  existingCases.forEach((caseItem) => {
    const match = String(caseItem.caseId || "").match(/USB-(\d+)/);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  });

  const year = new Date().getFullYear();
  return `USB-${year}-${String(highest + 1).padStart(4, "0")}`;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/agents", (req, res) => {
  const users = readJson(USERS_FILE, defaultUsers);
  res.json(Object.keys(users));
});

app.post("/api/login", (req, res) => {
  const { name, password } = req.body || {};
  const users = readJson(USERS_FILE, defaultUsers);

  if (!name || !password) {
    return res.status(400).json({ message: "Agent name and password are required." });
  }

  if (users[name] === password) {
    return res.json({ success: true, user: name });
  }

  return res.status(401).json({ message: "Invalid agent name or password." });
});

app.get("/api/complaints", (req, res) => {
  const complaints = readJson(COMPLAINTS_FILE, defaultComplaints);
  res.json(complaints);
});

app.get("/api/summary", (req, res) => {
  const complaints = readJson(COMPLAINTS_FILE, defaultComplaints);

  const summary = {
    total: complaints.length,
    open: complaints.filter((caseItem) => caseItem.status !== "Resolved").length,
    resolved: complaints.filter((caseItem) => caseItem.status === "Resolved").length,
    critical: complaints.filter((caseItem) => caseItem.priority === "Critical").length,
    totalLost: complaints.reduce((sum, caseItem) => sum + Number(caseItem.amountLost || 0), 0)
  };

  res.json(summary);
});

app.post("/api/complaints", (req, res) => {
  const payload = req.body || {};

  const requiredFields = [
    "complainantName",
    "bankName",
    "bankAccount",
    "complaintType",
    "amountLost",
    "incidentDate",
    "assignedAgent",
    "priority",
    "complaintDetails"
  ];

  const missing = requiredFields.filter((field) => !payload[field] && payload[field] !== 0);
  if (missing.length) {
    return res.status(400).json({ message: `Missing required field(s): ${missing.join(", ")}` });
  }

  const complaints = readJson(COMPLAINTS_FILE, defaultComplaints);
  const newComplaint = {
    caseId: generateCaseId(complaints),
    complainantName: String(payload.complainantName).trim(),
    bankName: String(payload.bankName).trim(),
    bankAccount: String(payload.bankAccount).trim(),
    complaintType: String(payload.complaintType).trim(),
    amountLost: Number(payload.amountLost),
    incidentDate: String(payload.incidentDate),
    assignedAgent: String(payload.assignedAgent).trim(),
    priority: String(payload.priority).trim(),
    complaintDetails: String(payload.complaintDetails).trim(),
    createdAt: new Date().toISOString(),
    status: "New"
  };

  complaints.push(newComplaint);
  writeJson(COMPLAINTS_FILE, complaints);

  return res.status(201).json(newComplaint);
});

app.patch("/api/complaints/:caseId/status", (req, res) => {
  const { caseId } = req.params;
  const { status } = req.body || {};

  if (!status) {
    return res.status(400).json({ message: "Status is required." });
  }

  const complaints = readJson(COMPLAINTS_FILE, defaultComplaints);
  const idx = complaints.findIndex((item) => item.caseId === caseId);

  if (idx === -1) {
    return res.status(404).json({ message: "Complaint not found." });
  }

  complaints[idx].status = status;
  complaints[idx].updatedAt = new Date().toISOString();
  writeJson(COMPLAINTS_FILE, complaints);

  return res.json(complaints[idx]);
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "bank-scam-complaints-portal" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureStorage();

app.listen(PORT, () => {
  console.log(`Bank scam complaint portal running on http://localhost:${PORT}`);
});
