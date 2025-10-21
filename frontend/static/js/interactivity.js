// interactivity.js
let agingChart = null;

// Dashboard functionality
async function loadDashboardData(customerId) {
  showLoadingState();

  try {
    const response = await fetch(`/api/receivables/${customerId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (data.detailed.length === 0) {
      hideLoadingState();
      showEmptyState();
      return;
    }

    hideLoadingState();
    updateSummaryCards(data.summary);
    updateAgingSummaryTable(data.summary);
    renderAgingChart(data.summary);
    updateDebtorsList(data.detailed);

    // Add fade-in animation
    document.querySelectorAll(".bg-white").forEach((card) => {
      card.classList.add("fade-in");
    });
  } catch (error) {
    console.error("Failed to fetch receivables data", error);
    hideLoadingState();
    alert("Error fetching data: " + error.message);
  }
}

function updateSummaryCards(summary) {
  // Update summary cards with Indian Rupee formatting
  document.getElementById("currentAmount").textContent = formatRupeeAmount(
    summary.current
  );
  document.getElementById("1_30Amount").textContent = formatRupeeAmount(
    summary["1_30"]
  );
  document.getElementById("31_60Amount").textContent = formatRupeeAmount(
    summary["31_60"]
  );
  document.getElementById("61_90Amount").textContent = formatRupeeAmount(
    summary["61_90"]
  );
  document.getElementById("over_90Amount").textContent = formatRupeeAmount(
    summary.over_90
  );

  // Add click handlers to summary cards
  document.querySelectorAll(".summary-card").forEach((card, index) => {
    card.addEventListener("click", () => {
      const filters = ["current", "1_30", "31_60", "61_90", "over_90"];
      window.location.href = `/invoice-details?customer_id=${getCurrentCustomerId()}&filter=${
        filters[index]
      }`;
    });
  });
}

function updateAgingSummaryTable(summary) {
  // Update table with detailed rupee amounts
  document.getElementById("tableCurrent").textContent =
    formatRupeeAmountDetailed(summary.current);
  document.getElementById("table1_30").textContent = formatRupeeAmountDetailed(
    summary["1_30"]
  );
  document.getElementById("table31_60").textContent = formatRupeeAmountDetailed(
    summary["31_60"]
  );
  document.getElementById("table61_90").textContent = formatRupeeAmountDetailed(
    summary["61_90"]
  );
  document.getElementById("tableOver90").textContent =
    formatRupeeAmountDetailed(summary.over_90);

  // Calculate and update total
  const totalOutstanding =
    summary.current +
    summary["1_30"] +
    summary["31_60"] +
    summary["61_90"] +
    summary.over_90;
  document.getElementById("tableTotal").textContent =
    formatRupeeAmountDetailed(totalOutstanding);
}

function formatRupeeAmount(amount) {
  if (amount === 0) return "₹0";

  // Format for Indian numbering system
  if (amount >= 10000000) {
    return "₹" + (amount / 10000000).toFixed(2) + "Cr";
  } else if (amount >= 100000) {
    return "₹" + (amount / 100000).toFixed(2) + "L";
  } else if (amount >= 1000) {
    return "₹" + (amount / 1000).toFixed(2) + "K";
  } else {
    return "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }
}

function formatRupeeAmountDetailed(amount) {
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function renderAgingChart(summary) {
  const labels = [
    "Current",
    "1-30 Days",
    "31-60 Days",
    "61-90 Days",
    "Over 90 Days",
  ];
  const data = [
    summary.current,
    summary["1_30"],
    summary["31_60"],
    summary["61_90"],
    summary.over_90,
  ];

  const colors = [
    "#4ade80", // green
    "#60a5fa", // blue
    "#facc15", // yellow
    "#fb923c", // orange
    "#f87171", // red
  ];

  const ctx = document.getElementById("agingChart").getContext("2d");

  if (agingChart) {
    agingChart.destroy();
  }

  agingChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderWidth: 3,
          borderColor: "#ffffff",
          hoverBorderWidth: 4,
          hoverBorderColor: "#f8fafc",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 11,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${formatRupeeAmountDetailed(
                value
              )} (${percentage}%)`;
            },
          },
        },
      },
      animation: {
        animateScale: true,
        animateRotate: true,
      },
    },
  });
}

function updateDebtorsList(invoices) {
  // Group invoices by customer and calculate totals
  const customerTotals = {};

  invoices.forEach((invoice) => {
    if (!customerTotals[invoice.customer_id]) {
      customerTotals[invoice.customer_id] = {
        total: 0,
        maxAging: 0,
      };
    }
    customerTotals[invoice.customer_id].total += invoice.outstanding_amount;
    customerTotals[invoice.customer_id].maxAging = Math.max(
      customerTotals[invoice.customer_id].maxAging,
      invoice.aging_days
    );
  });

  // Convert to array and sort by total (descending)
  const topDebtors = Object.entries(customerTotals)
    .map(([customerId, data]) => ({
      customerId,
      total: data.total,
      maxAging: data.maxAging,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5); // Top 5 debtors

  const debtorsContainer = document.getElementById("debtorsList");

  if (topDebtors.length === 0) {
    debtorsContainer.innerHTML = `
            <div class="text-center text-gray-500 py-4">
                <div class="text-4xl mb-2">📊</div>
                <p>No outstanding invoices</p>
            </div>
        `;
    return;
  }

  debtorsContainer.innerHTML = topDebtors
    .map(
      (debtor) => `
        <div class="debtor-item" onclick="viewCustomerInvoices('${
          debtor.customerId
        }')">
            <div class="debtor-name">${debtor.customerId}</div>
            <div class="debtor-amount">${formatRupeeAmount(debtor.total)}</div>
            <div class="debtor-days">Max aging: ${debtor.maxAging} days</div>
        </div>
    `
    )
    .join("");
}

function viewCustomerInvoices(customerId) {
  window.location.href = `/invoice-details?customer_id=${customerId}&filter=all`;
}

function getCurrentCustomerId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("customer_id") || "test_customer";
}

// Invoice Details functionality
async function loadInvoiceDetails(customerId, filter) {
  showInvoiceLoadingState();

  try {
    const response = await fetch(`/api/receivables/${customerId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const filteredInvoices = filterInvoices(data.detailed, filter);
    displayInvoiceTable(filteredInvoices);
  } catch (error) {
    console.error("Failed to fetch invoice data", error);
    hideInvoiceLoadingState();
    alert("Error fetching invoice data: " + error.message);
  }
}

function filterInvoices(invoices, filter) {
  if (filter === "all") {
    return invoices;
  }

  return invoices.filter((invoice) => {
    const aging = invoice.aging_days;

    switch (filter) {
      case "current":
        return aging === 0;
      case "1_30":
        return aging >= 1 && aging <= 30;
      case "31_60":
        return aging >= 31 && aging <= 60;
      case "61_90":
        return aging >= 61 && aging <= 90;
      case "over_90":
        return aging > 90;
      default:
        return true;
    }
  });
}

function displayInvoiceTable(invoices) {
  hideInvoiceLoadingState();

  if (invoices.length === 0) {
    showInvoiceEmptyState();
    return;
  }

  const invoiceBody = invoices
    .map(
      (invoice) => `
        <tr class="hover:bg-gray-50 cursor-pointer" onclick="viewInvoice('${
          invoice.invoice_number
        }')">
            <td class="font-medium">${invoice.invoice_number}</td>
            <td>${invoice.invoice_date}</td>
            <td>${invoice.due_date}</td>
            <td class="text-right">${formatRupeeAmountDetailed(
              invoice.amount_due
            )}</td>
            <td class="text-right">${formatRupeeAmountDetailed(
              invoice.amount_paid
            )}</td>
            <td class="text-right font-semibold">${formatRupeeAmountDetailed(
              invoice.outstanding_amount
            )}</td>
            <td class="text-right ${getAgingColorClass(invoice.aging_days)}">${
        invoice.aging_days
      }</td>
        </tr>
    `
    )
    .join("");

  document.getElementById("invoiceData").innerHTML = invoiceBody;
}

function viewInvoice(invoiceNumber) {
  alert(`Viewing details for invoice: ${invoiceNumber}`);
}

function getAgingColorClass(agingDays) {
  if (agingDays === 0) return "text-green-600";
  if (agingDays <= 30) return "text-blue-600";
  if (agingDays <= 60) return "text-yellow-600";
  if (agingDays <= 90) return "text-orange-600";
  return "text-red-600";
}

// Loading state functions
function showLoadingState() {
  document.getElementById("loadingState").classList.remove("hidden");
}

function hideLoadingState() {
  document.getElementById("loadingState").classList.add("hidden");
}

function showEmptyState() {
  // You can implement an empty state if needed
}

function showInvoiceLoadingState() {
  // Implement for invoice details page
}

function hideInvoiceLoadingState() {
  // Implement for invoice details page
}

function showInvoiceEmptyState() {
  // Implement for invoice details page
}
