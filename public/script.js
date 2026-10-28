const state = {
  agents: [],
  complaints: [],
  summary: {},
  currentUser: null
};

const loginForm = document.getElementById("loginForm");
const loginAgent = document.getElementById("loginAgent");
const loginPassword = document.getElementById("loginPassword");
const loginMessage = document.getElementById("loginMessage");
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loggedInUser = document.getElementById("loggedInUser");
const logoutBtn = document.getElementById("logoutBtn");
const complaintForm = document.getElementById("complaintForm");
const summaryGrid = document.getElementById("summaryGrid");
const casesTableBody = document.getElementById("casesTableBody");
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");
const agentFilter = document.getElementById("agentFilter");
const searchInput = document.getElementById("searchInput");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const resultsCount = document.getElementById("resultsCount");
const caseIdBadge = document.getElementById("caseIdBadge");

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

async function loadAgents() {
  const agents = await apiFetch("/api/agents");
  state.agents = agents;

  const options = [
    '<option value="">Select agent</option>',
    ...agents.map((agent) => `<option value="${agent}">${agent}</option>`)
  ].join("");

  loginAgent.innerHTML = options;
  const assignedAgent = document.querySelector('select[name="assignedAgent"]');
  assignedAgent.innerHTML = options;
  if (state.currentUser) assignedAgent.value = state.currentUser;

  const agentFilterOptions = [
    '<option value="All">All agents</option>',
    ...agents.map((agent) => `<option value="${agent}">${agent}</option>`)
  ].join("");
  agentFilter.innerHTML = agentFilterOptions;
}

async function loadComplaints() {
  state.complaints = await apiFetch("/api/complaints");
  state.summary = await apiFetch("/api/summary");
  renderSummary();
  renderCases();
}

function renderSummary() {
  const { total = 0, open = 0, resolved = 0, critical = 0, totalLost = 0 } = state.summary;

  summaryGrid.innerHTML = [
    { label: "Total complaints", value: total, classes: "primary" },
    { label: "Open cases", value: open, classes: "info" },
    { label: "Resolved", value: resolved, classes: "success" },
    { label: "Critical", value: critical, classes: "warning" },
    { label: "Total lost", value: `$${Number(totalLost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, classes: "primary" }
  ].map((card) => `
    <div class="summary-card ${card.classes}">
      <span class="label">${card.label}</span>
      <span class="value">${card.value}</span>
    </div>
  `).join("");
}

function getFilteredCases() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const statusValue = statusFilter.value;
  const priorityValue = priorityFilter.value;
  const agentValue = agentFilter.value;

  return state.complaints.filter((item) => {
    const haystack = [
      item.caseId,
      item.bankName,
      item.complainantName,
      item.complaintType,
      item.assignedAgent
    ].join(" ").toLowerCase();

    const matchesSearch = !searchTerm || haystack.includes(searchTerm);
    const matchesStatus = statusValue === "All" || item.status === statusValue;
    const matchesPriority = priorityValue === "All" || item.priority === priorityValue;
    const matchesAgent = agentValue === "All" || item.assignedAgent === agentValue;

    return matchesSearch && matchesStatus && matchesPriority && matchesAgent;
  });
}

function renderCases() {
  const filtered = getFilteredCases();
  resultsCount.textContent = `${filtered.length} case${filtered.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    casesTableBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">No complaints match the current filters.</div>
        </td>
      </tr>
    `;
    return;
  }

  casesTableBody.innerHTML = filtered
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((item) => `
      <tr>
        <td><span class="case-id">${item.caseId}</span></td>
        <td>${item.bankName}</td>
        <td>${item.complainantName}</td>
        <td>${item.assignedAgent}</td>
        <td><span class="priority-badge priority-${item.priority.toLowerCase()}">${item.priority}</span></td>
        <td><span class="status-badge status-${item.status.toLowerCase().replace(/\s+/g, "-")}">${item.status}</span></td>
        <td class="amount">$${Number(item.amountLost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="action-cell">
          <select class="small-select" data-case-id="${item.caseId}">
            <option value="New" ${item.status === "New" ? "selected" : ""}>New</option>
            <option value="In Review" ${item.status === "In Review" ? "selected" : ""}>In Review</option>
            <option value="Pending" ${item.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Resolved" ${item.status === "Resolved" ? "selected" : ""}>Resolved</option>
          </select>
        </td>
      </tr>
    `).join("");
}

function showLogin() {
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  loggedInUser.textContent = "Guest";
  loggedInUser.classList.add("hidden");
  logoutBtn.classList.add("hidden");
}

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  loggedInUser.textContent = state.currentUser;
  loggedInUser.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  const assignedAgent = document.querySelector('select[name="assignedAgent"]');
  if (assignedAgent) assignedAgent.value = state.currentUser || "";
}

function setCaseIdPreview() {
  const nextCaseId = state.complaints.length
    ? `USB-${new Date().getFullYear()}-${String(Math.max(...state.complaints.map((item) => Number(String(item.caseId).match(/(\d+)$/)?.[1] || 0))) + 1).padStart(4, "0")}`
    : `USB-${new Date().getFullYear()}-0001`;

  caseIdBadge.textContent = `Case ID: ${nextCaseId}`;
}

async function submitComplaint(event) {
  event.preventDefault();

  const formData = new FormData(complaintForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await apiFetch("/api/complaints", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    complaintForm.reset();
    await loadComplaints();
    setCaseIdPreview();
  } catch (error) {
    alert(error.message || "Unable to submit complaint");
  }
}

async function loginHandler(event) {
  event.preventDefault();

  try {
    const response = await apiFetch("/api/login", {
      method: "POST",
      body: JSON.stringify({
        name: loginAgent.value,
        password: loginPassword.value
      })
    });

    state.currentUser = response.user;
    loginMessage.textContent = "Login successful";
    loginMessage.classList.remove("hidden", "error");
    loginMessage.classList.add("success");

    setTimeout(() => {
      showDashboard();
      loginForm.reset();
      loginPassword.value = "bank123";
      loginMessage.classList.add("hidden");
    }, 300);
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.classList.remove("hidden", "success");
    loginMessage.classList.add("error");
  }
}

async function handleStatusUpdate(event) {
  const target = event.target;
  if (!target.classList.contains("small-select")) return;

  const caseId = target.dataset.caseId;
  const status = target.value;

  try {
    await apiFetch(`/api/complaints/${caseId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await loadComplaints();
  } catch (error) {
    alert(error.message || "Could not update status");
  }
}

function exportCsv() {
  if (!state.complaints.length) return;

  const rows = [
    [
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
    ]
  ];

  getFilteredCases().forEach((item) => {
    rows.push([
      item.caseId,
      item.complainantName,
      item.bankName,
      item.bankAccount,
      item.complaintType,
      item.amountLost,
      item.incidentDate,
      item.assignedAgent,
      item.priority,
      item.status,
      item.complaintDetails
    ]);
  });

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bank-scam-complaints.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

logoutBtn.addEventListener("click", () => {
  state.currentUser = null;
  showLogin();
  loginForm.reset();
  loginPassword.value = "bank123";
});

loginForm.addEventListener("submit", loginHandler);
complaintForm.addEventListener("submit", submitComplaint);
statusFilter.addEventListener("change", renderCases);
priorityFilter.addEventListener("change", renderCases);
agentFilter.addEventListener("change", renderCases);
searchInput.addEventListener("input", renderCases);
exportCsvBtn.addEventListener("click", exportCsv);
document.addEventListener("change", handleStatusUpdate);

async function init() {
  await loadAgents();
  await loadComplaints();
  setCaseIdPreview();
  showLogin();
}

init();
