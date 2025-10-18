document.addEventListener("DOMContentLoaded", () => {
  const fetchBtn = document.getElementById("fetchBtn");
  const customerInput = document.getElementById("customerId");

  fetchBtn.addEventListener("click", async () => {
    const customerId = customerInput.value.trim();
    if (!customerId) {
      alert("Please enter a valid Customer ID");
      return;
    }
    fetchBtn.disabled = true;
    fetchBtn.textContent = "Loading...";
    customerInput.disabled = true;

    try {
      const response = await fetch(`/api/receivables/${customerId}`);
      if (!response.ok) {
        let msg = response.statusText;
        try {
          const errorData = await response.json();
          msg = errorData.detail || JSON.stringify(errorData);
        } catch (_) {}
        alert(`Error: ${msg}`);
        return;
      }
      const data = await response.json();

      // Show the aging summary table
      const summaryKeys = ["current", "1_30", "31_60", "61_90", "over_90"];
      const summaryLabels = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', 'Over 90 Days'];
      let summaryBody = "";
      summaryKeys.forEach((key, i) => {
        summaryBody += `<tr><td>${summaryLabels[i]}</td><td>$${data.summary[key].toFixed(2)}</td></tr>`;
      });
      document.getElementById("summaryData").innerHTML = summaryBody;
      document.getElementById("summary").classList.remove("hidden");

      // Render pie chart at a fixed small size
      renderChart(summaryLabels, summaryKeys.map(k => data.summary[k]));

      // Show invoice details table
      const detailsBody = data.detailed.map(inv => `
        <tr>
          <td>${inv.invoice_number}</td>
          <td>${inv.invoice_date}</td>
          <td>${inv.due_date}</td>
          <td>$${inv.amount_due.toFixed(2)}</td>
          <td>$${inv.amount_paid.toFixed(2)}</td>
          <td>$${inv.outstanding_amount.toFixed(2)}</td>
          <td>${inv.aging_days}</td>
        </tr>`).join("");
      document.getElementById("detailsData").innerHTML = detailsBody;
      document.getElementById("details").classList.remove("hidden");

    } catch (e) {
      console.error("Failed to fetch receivables data", e);
      alert("Error fetching data");
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.textContent = "Fetch Report";
      customerInput.disabled = false;
    }
  });
});

let agingChart;
function renderChart(labels, data) {
  const canvas = document.getElementById('agingChart');
  const ctx = canvas.getContext('2d');

  // Increase logical drawing size to match CSS
  canvas.width = 500;   // was 500
  canvas.height = 500;  // was 500

  if (agingChart) {
    agingChart.data.labels = labels;
    agingChart.data.datasets[0].data = data;
    agingChart.update();
    return;
  }

  agingChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Aging Buckets',
        data,
        backgroundColor: ['#4ade80', '#a3e635', '#facc15', '#f87171', '#c084fc'],
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom' } },
      layout: { padding: 0 }
    }
  });
}
