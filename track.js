const $ = s => document.querySelector(s);
async function lookup(value) {
  const result = $("#result");
  result.innerHTML = "";
  try {
    const res = await fetch("/api/shipments/" + encodeURIComponent(value.trim()));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Shipment not found");
    result.innerHTML = `
      <div class="box">
        <span class="badge">${escapeHtml(data.status)}</span>
        <h2>Shipment ${escapeHtml(data.tracking_number)}</h2>
        <p><b>Service:</b> ${escapeHtml(data.service)}<br><b>Estimated delivery:</b> ${escapeHtml(data.estimated_delivery || "Not available")}</p>
        <div class="route">
          <div><small>Origin</small><strong>${escapeHtml(data.origin)}</strong></div>
          <div><small>Destination</small><strong>${escapeHtml(data.destination)}</strong></div>
        </div>
        <h3>Shipment history</h3>
        <div class="timeline">${data.events.map(e => `
          <div class="event"><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(e.location || "")} • ${escapeHtml(e.event_time)}</small></div>
        `).join("")}</div>
      </div>`;
  } catch(err) {
    result.innerHTML = `<div class="error">${escapeHtml(err.message)}. Please verify the tracking number.</div>`;
  }
}
$("#trackForm").addEventListener("submit", e => {e.preventDefault(); lookup($("#tracking").value);});
$("#demo").addEventListener("click", () => {$("#tracking").value="AEF123456789";lookup("AEF123456789");});
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
