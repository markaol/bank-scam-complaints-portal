const STORAGE_KEY = "usa_bank_complaint_cases";
const USERS_KEY = "usa_bank_complaint_users";

const agentNames = [
  "Emma Johnson",
  "Daniel Moore",
  "Sophia Patel",
  "Marcus Green",
  "Olivia Davis"
];

const defaultUsers = agentNames.reduce((acc, name) => {
  acc[name] = "bank123";
  return acc;
}, {});

const complaintForm = document.getElementById("complaintForm");
const loginForm = document.getElementById("loginForm");
const casesTableBody = document.getElementById("casesTableBody");
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");
const agentFilter = document.getElementById("agentFilter");
const searchInput = document.getElementById("searchInput");
const resultsCount = document.getElementById("resultsCount");
const summaryGrid = document.getElementById("summaryGrid");
const loggedInUser = document.getElementById("loggedInUser");
const logoutBtn = document.getElementById("logoutBtn");
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginMessage = document.getElementById("loginMessage");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const caseIdBadge = document.getElementById("caseIdBadge");

function initUsers() {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  }
}

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
}

function getCurrentUser() {
  return localStorage.getItem("currentAgent");
}

function setCurrentUser(name) {
  localStorage.setItem("currentAgent", name || "");
}

function isLoggedIn() {
  return Boolean(getCurrentUser());
}

function showLoginNotification(message, type = "error") {
  loginMessage.textContent = message;
  loginMessage.classList.remove("hidden");
  loginMessage.classList.remove("success", "error");
  loginMessage.classList.add(type);
}

function showDashboard() {
  const currentUser = getCurrentUser();
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  loggedInUser.textContent = currentUser;
  loggedInUser.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  const assignedAgentSelects = document.querySelectorAll('select[name="assignedAgent"]');
  const agentOptions = ["<option value=''>Select agent</option>", ...agentNames.map((name) => `<option value="${name}">${name}</option>`)].join("");
  assignedAgentSelects.forEach((select) => {
    select.innerHTML = agentOptions;
    select.value = currentUser || "";
  });

  populateAgentFilter();
  renderCases();
  renderSummary();
}

function showLogin() {
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  loggedInUser.classList.add("hidden");
  logoutBtn.classList.add("hidden");
}

function populateAgentFilter() {
  const select = document.getElementById("agentFilter");
  const options = [
    '<option value="All">All agents</option>',
    ...agentNames.map((name) => `<option value="${name}">${name}</option>`)
  ];
  select.innerHTML = options.join("");
}

function generateCaseId() {
  const existing = getCases();
  let highest = 0;

  for (const item of existing) {
    const match = item.caseId && item.caseId.match(/USB-(\d+)/);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  }

  const year = new Date().getFullYear();
  return `USB-${year}-${String(highest + 1).padStart(4, "0")}`;
}

function getCases() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveCases(cases) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

function getFilteredCases() {
  const term = searchInput.value.trim().toLowerCase();
  const statusVal = statusFilter.value;
  const priorityVal = priorityFilter.value;
  const agentVal = agentFilter.value;
  const cases = getCases();

  return cases.filter((item) => {
    const matchesSearch = !term || [
      item.caseId,
      item.bankName,
      item.complainantName,
      item.complaintType,
      item.assignedAgent
    ].some((field) => String(field || "").toLowerCase().includes(term));

    const matchesStatus = statusVal === "All" || item.status === statusVal;
    const matchesPriority = priorityVal === "All" || item.priority === priorityVal;
    const matchesAgent = agentVal === "All" || item.assignedAgent === agentVal;

    return matchesSearch && matchesStatus && matchesPriority && matchesAgent;
  });
}

function renderSummary() {
  const cases = getCases();
  const openCases = cases.filter((item) => item.status !== "Resolved").length;
  const resolvedCases = cases.filter((item) => item.status === "Resolved").length;
  const criticalCases = cases.filter((item) => item.priority === "Critical").length;
  const totalLost = cases.reduce((sum, item) => sum + Number(item.amountLost || 0), 0);

  const cards = [
    { label: "Total complaints", value: cases.length, classes: "primary" },
    { label: "Open cases", value: openCases, classes: "info" },
    { label: "Resolved", value: resolvedCases, classes: "success" },
    { label: "Critical", value: criticalCases, classes: "warning" }
  ];

  const totalLostCard = {
    label: "Total lost", value: `$${totalLost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    classes: "primary"
  };

  const allCards = [...cards.slice(0, 3), totalLostCard, cards[3]];

  summaryGrid.innerHTML = allCards.map((card) => `
    <div class="summary-card ${card.classes}">
      <span class="label">${card.label}</span>
      <span class="value">${card.value}</span>
    </div>
  `).join("");
}

function renderCases() {
  const filteredCases = getFilteredCases();
  resultsCount.textContent = `${filteredCases.length} case${filteredCases.length === 1 ? "" : "s"}`;

  if (!filteredCases.length) {
    casesTableBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">No complaints match the current filters.</div>
        </td>
      </tr>
    `;
    return;
  }

  filteredCases
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((caseItem) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><span class="case-id">${caseItem.caseId}</span></td>
        <td>${caseItem.bankName}</td>
        <td>${caseItem.complainantName}</td>
        <td>${caseItem.assignedAgent}</td>
        <td><span class="priority-badge priority-${caseItem.priority.toLowerCase()}">${caseItem.priority}</span></td>
        <td><span class="status-badge status-${caseItem.status.toLowerCase().replace(/\s+/g, "-")}">${caseItem.status}</span></td>
        <td class="amount">$${Number(caseItem.amountLost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="action-cell">
          <select class="small-select" data-case-id="${caseItem.caseId}">
            <option value="New" ${caseItem.status === "New" ? "selected" : ""}>New</option>
            <option value="In Review" ${caseItem.status === "In Review" ? "selected" : ""}>In Review</option>
            <option value="Pending" ${caseItem.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Resolved" ${caseItem.status === "Resolved" ? "selected" : ""}>Resolved</option>
          </select>
        </td>
      `;
      casesTableBody.appendChild(row);
    });
}

function seedDemoData() {
  if (getCases().length) return;

  const demoCases = [
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

  saveCases(demoCases);
}

function attachStatusHandlers() {
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.classList.contains("small-select")) {
      const caseId = target.dataset.caseId;
      const newStatus = target.value;
      const cases = getCases().map((item) => (
        item.caseId === caseId ? { ...item, status: newStatus } : item
      ));
      saveCases(cases);
      renderSummary();
      renderCases();
    }
  });
}

function exportToCsv() {
  const cases = getFilteredCases();
  if (!cases.length) return;

  const headers = [
    "caseId",
    "complainantName",
    "bankName",
    "bankAccount",
    "complaintType",
    "amountLost",
    "incidentDate",
    "assignedAgent",
    "priority",
    "status",
    "complaintDetails"
  ];

  const csvRows = [headers.join(",")];

  cases.forEach((item) => {
    const values = headers.map((header) => {
      const value = item[header] ?? "";
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  });

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bank-scam-complaints.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function setCaseIdPreview() {
  caseIdBadge.textContent = `Case ID: ${generateCaseId()}`;
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const selectedAgent = document.getElementById("loginAgent").value;
  const password = document.getElementById("loginPassword").value;

  const users = getUsers();
  if (users[selectedAgent] && users[selectedAgent] === password) {
    setCurrentUser(selectedAgent);
    showLoginNotification("Login successful.", "success");
    setTimeout(() => {
      showDashboard();
    }, 250);
  } else {
    showLoginNotification("Invalid agent name or password.", "error");
  }
});

logoutBtn.addEventListener("click", () => {
  setCurrentUser("");
  showLogin();
  loginForm.reset();
  document.getElementById("loginPassword").value = "bank123";
});

complaintForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(complaintForm);
  const complaint = {
    caseId: generateCaseId(),
    complainantName: formData.get("complainantName").toString().trim(),
    bankName: formData.get("bankName").toString().trim(),
    bankAccount: formData.get("bankAccount").toString(),
    complaintType: formData.get("complaintType").toString(),
    amountLost: Number(formData.get("amountLost") || 0),
    incidentDate: formData.get("incidentDate").toString(),
    assignedAgent: formData.get("assignedAgent").toString(),
    priority: formData.get("priority").toString(),
    complaintDetails: formData.get("complaintDetails").toString().trim(),
    createdAt: new Date().toISOString(),
    status: "New"
  };

  const cases = getCases();
  cases.push(complaint);
  saveCases(cases);

  complaintForm.reset();
  setCaseIdPreview();
  renderSummary();
  renderCases();
});

statusFilter.addEventListener("change", renderCases);
priorityFilter.addEventListener("change", renderCases);
agentFilter.addEventListener("change", renderCases);
searchInput.addEventListener("input", renderCases);
exportCsvBtn.addEventListener("click", exportToCsv);

initUsers();
seedDemoData();
setCaseIdPreview();
attachStatusHandlers();

if (isLoggedIn()) {
  showDashboard();
} else {
  showLogin();
}
