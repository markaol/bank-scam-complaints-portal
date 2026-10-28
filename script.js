const STORAGE_KEY = "usa_bank_complaint_cases";

const complaintForm = document.getElementById("complaintForm");
const complaintList = document.getElementById("complaintList");
const statusFilter = document.getElementById("statusFilter");

function generateCaseId() {
  const existing = getCases();
  let maxNumber = 0;

  for (const item of existing) {
    const match = item.caseId && item.caseId.match(/USB-(\d+)/);
    if (match) {
      const num = Number(match[1]);
      if (num > maxNumber) maxNumber = num;
    }
  }

  const year = new Date().getFullYear();
  return `USB-${year}-${String(maxNumber + 1).padStart(4, "0")}`;
}

function getCases() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveCases(cases) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

function updateStats() {
  const cases = getCases();
  const total = cases.length;
  const open = cases.filter((item) => item.status !== "Resolved").length;
  const resolved = cases.filter((item) => item.status === "Resolved").length;

  document.getElementById("totalCases").textContent = total;
  document.getElementById("openCases").textContent = open;
  document.getElementById("resolvedCases").textContent = resolved;
}

function renderCases() {
  const cases = getCases();
  const filterValue = statusFilter.value;

  const filteredCases = filterValue === "All"
    ? cases
    : cases.filter((item) => item.status === filterValue);

  complaintList.innerHTML = "";

  if (filteredCases.length === 0) {
    complaintList.innerHTML = `
      <div class="empty-state">
        No complaints match this filter yet.
      </div>
    `;
    return;
  }

  filteredCases
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((caseItem) => {
      const card = document.createElement("div");
      card.className = "case-card";

      const statusClass = caseItem.status.toLowerCase().replace(/\s+/g, "-");
      const statusLabel = caseItem.status;

      card.innerHTML = `
        <div class="case-header">
          <div class="case-title">
            <h4>${caseItem.caseId}</h4>
            <span class="status-pill status-${statusClass}">${statusLabel}</span>
          </div>

          <span class="agent">${caseItem.assignedAgent}</span>
        </div>

        <div class="case-meta">
          <span><strong>Bank:</strong> ${caseItem.bankName}</span>
          <span><strong>Complainant:</strong> ${caseItem.complainantName}</span>
          <span><strong>Type:</strong> ${caseItem.complaintType}</span>
          <span><strong>Date:</strong> ${new Date(caseItem.incidentDate).toLocaleDateString()}</span>
        </div>

        <div class="case-body">
          ${caseItem.complaintDetails}
        </div>

        <div class="case-footer">
          <div class="amount">$${Number(caseItem.amountLost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="status-actions">
            <select class="select-status" data-case-id="${caseItem.caseId}">
              <option value="New" ${caseItem.status === "New" ? "selected" : ""}>New</option>
              <option value="In Review" ${caseItem.status === "In Review" ? "selected" : ""}>In Review</option>
              <option value="Pending" ${caseItem.status === "Pending" ? "selected" : ""}>Pending</option>
              <option value="Resolved" ${caseItem.status === "Resolved" ? "selected" : ""}>Resolved</option>
            </select>
          </div>
        </div>
      `;

      complaintList.appendChild(card);
    });
}

complaintForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const formData = new FormData(complaintForm);
  const complaint = {
    caseId: generateCaseId(),
    complainantName: formData.get("complainantName").toString().trim(),
    bankName: formData.get("bankName").toString().trim(),
    bankAccount: formData.get("bankAccount").toString(),
    complaintType: formData.get("complaintType").toString(),
    amountLost: Number(formData.get("amountLost")),
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
  updateStats();
  renderCases();
});

statusFilter.addEventListener("change", renderCases);

document.addEventListener("change", function (event) {
  const target = event.target;
  if (target.classList.contains("select-status")) {
    const selectedStatus = target.value;
    const caseId = target.dataset.caseId;

    const cases = getCases();
    const updated = cases.map((item) => {
      if (item.caseId === caseId) {
        return { ...item, status: selectedStatus };
      }
      return item;
    });

    saveCases(updated);
    updateStats();
    renderCases();
  }
});

function seedDemoData() {
  const existing = getCases();
  if (existing.length > 0) return;

  const demo = [
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
    }
  ];

  saveCases(demo);
}

seedDemoData();
updateStats();
renderCases();
