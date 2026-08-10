let shipments = [];

const $ = s => document.querySelector(s);

async function api(url, options={}) {
  const res = await fetch(url, {headers: {"Content-Type":"application/json"}, ...options});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function init() {
  const me = await api("/api/me");
  if (me.authenticated) showDashboard();
  else showLogin();
}

function showLogin() {
  $("#loginPanel").hidden = false;
  $("#dashboard").hidden = true;
}
async function showDashboard() {
  $("#loginPanel").hidden = true;
  $("#dashboard").hidden = false;
  await loadShipments();
}

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("#loginMsg").textContent = "";
  try {
    await api("/api/login", {method:"POST", body:JSON.stringify({username:$("#username").value,password:$("#password").value})});
    showDashboard();
  } catch(err) { $("#loginMsg").textContent = err.message; }
});

$("#logout").addEventListener("click", async () => {
  await api("/api/logout", {method:"POST"});
  showLogin();
});

$("#refresh").addEventListener("click", loadShipments);

$("#createForm").addEventListener("submit", async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.currentTarget).entries());
  try {
    const result = await api("/api/shipments", {method:"POST", body:JSON.stringify(data)});
    $("#createMsg").textContent = `Created successfully. Tracking number: ${result.tracking_number}`;
    e.currentTarget.reset();
    await loadShipments();
  } catch(err) { $("#createMsg").textContent = err.message; }
});

$("#updateForm").addEventListener("submit", async e => {
  e.preventDefault();
  const tracking = $("#updateTracking").value.trim();
  try {
    await api("/api/shipments/" + encodeURIComponent(tracking), {
      method:"PUT",
      body:JSON.stringify({
        status:$("#updateStatus").value,
        location:$("#updateLocation").value,
        estimated_delivery:$("#updateEstimate").value
      })
    });
    $("#updateMsg").textContent = "Shipment updated.";
    await loadShipments();
  } catch(err) { $("#updateMsg").textContent = err.message; }
});

async function loadShipments() {
  try {
    shipments = await api("/api/shipments");
    renderRows();
  } catch(err) {
    if (err.message === "Unauthorized") showLogin();
  }
}

function renderRows() {
  const q = $("#search").value.toLowerCase();
  const filtered = shipments.filter(s => JSON.stringify(s).toLowerCase().includes(q));
  $("#rows").innerHTML = filtered.map(s => `
    <tr>
      <td><strong>${escapeHtml(s.tracking_number)}</strong></td>
      <td>${escapeHtml(s.customer_name)}</td>
      <td>${escapeHtml(s.origin)} → ${escapeHtml(s.destination)}</td>
      <td>${escapeHtml(s.service)}</td>
      <td><span class="pill">${escapeHtml(s.status)}</span></td>
      <td>${escapeHtml(s.estimated_delivery || "—")}</td>
      <td><button class="danger" onclick="deleteShipment('${encodeURIComponent(s.tracking_number)}')">Delete</button></td>
    </tr>
  `).join("");
}

window.deleteShipment = async encoded => {
  const tracking = decodeURIComponent(encoded);
  if (!confirm(`Delete shipment ${tracking}?`)) return;
  try {
    await api("/api/shipments/" + encodeURIComponent(tracking), {method:"DELETE"});
    await loadShipments();
  } catch(err) { alert(err.message); }
};

$("#search").addEventListener("input", renderRows);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
init();
