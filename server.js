/*
  American Eagle Freight - Full demo tracking system
  Node.js + Express + SQLite
  IMPORTANT: Change ADMIN_PASSWORD and SESSION_SECRET before deployment.
*/

const express = require("express");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123!";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-session-secret";

const db = new Database(path.join(__dirname, "shipping.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Shipment Created',
  estimated_delivery TEXT,
  cargo_details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shipment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  event_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);
`);

const count = db.prepare("SELECT COUNT(*) AS c FROM shipments").get().c;
if (count === 0) {
  const demo = db.prepare(`
    INSERT INTO shipments
    (tracking_number, customer_name, origin, destination, service, status, estimated_delivery, cargo_details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "AEF123456789",
    "Demo Customer",
    "Washington, DC, USA",
    "New York, NY, USA",
    "Ground Shipping",
    "In Transit",
    "2026-08-14",
    "Demo shipment — replace with a real shipment."
  );
  const shipmentId = demo.lastInsertRowid;
  const event = db.prepare(`
    INSERT INTO shipment_events (shipment_id, title, location, event_time)
    VALUES (?, ?, ?, ?)
  `);
  event.run(shipmentId, "Shipment created", "Washington, DC", "2026-08-10 09:15:00");
  event.run(shipmentId, "Departed origin facility", "Washington, DC", "2026-08-10 14:40:00");
  event.run(shipmentId, "In transit to destination", "En route", "2026-08-10 18:00:00");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, "public")));

function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

function normalizeTracking(value) {
  return String(value || "").trim().toUpperCase();
}

function generateTracking() {
  let number;
  do {
    number = "AEF" + Math.floor(100000000 + Math.random() * 900000000);
  } while (db.prepare("SELECT 1 FROM shipments WHERE tracking_number = ?").get(number));
  return number;
}

function getShipment(trackingNumber) {
  const shipment = db.prepare("SELECT * FROM shipments WHERE tracking_number = ?").get(normalizeTracking(trackingNumber));
  if (!shipment) return null;
  shipment.events = db.prepare(`
    SELECT title, location, event_time
    FROM shipment_events
    WHERE shipment_id = ?
    ORDER BY datetime(event_time) ASC, id ASC
  `).all(shipment.id);
  return shipment;
}

app.post("/api/login", (req, res) => {
  const username = String(req.body.username || "");
  const password = String(req.body.password || "");
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: "Invalid username or password" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.admin), username: req.session?.admin ? ADMIN_USERNAME : null });
});

app.get("/api/shipments", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM shipments ORDER BY id DESC").all();
  res.json(rows);
});

app.get("/api/shipments/:tracking", (req, res) => {
  const shipment = getShipment(req.params.tracking);
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });
  // Public tracking intentionally exposes only shipment-related fields.
  res.json({
    tracking_number: shipment.tracking_number,
    origin: shipment.origin,
    destination: shipment.destination,
    service: shipment.service,
    status: shipment.status,
    estimated_delivery: shipment.estimated_delivery,
    events: shipment.events
  });
});

app.post("/api/shipments", requireAdmin, (req, res) => {
  const tracking = normalizeTracking(req.body.tracking_number) || generateTracking();
  const fields = {
    tracking,
    customer_name: String(req.body.customer_name || "").trim(),
    origin: String(req.body.origin || "").trim(),
    destination: String(req.body.destination || "").trim(),
    service: String(req.body.service || "").trim(),
    status: String(req.body.status || "Shipment Created").trim(),
    estimated_delivery: String(req.body.estimated_delivery || "").trim(),
    cargo_details: String(req.body.cargo_details || "").trim()
  };
  if (!fields.customer_name || !fields.origin || !fields.destination || !fields.service) {
    return res.status(400).json({ error: "Customer, origin, destination and service are required." });
  }
  try {
    const info = db.prepare(`
      INSERT INTO shipments
      (tracking_number, customer_name, origin, destination, service, status, estimated_delivery, cargo_details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(fields.tracking, fields.customer_name, fields.origin, fields.destination, fields.service, fields.status, fields.estimated_delivery, fields.cargo_details);
    db.prepare(`
      INSERT INTO shipment_events (shipment_id, title, location)
      VALUES (?, ?, ?)
    `).run(info.lastInsertRowid, fields.status, fields.origin);
    res.json({ ok: true, tracking_number: fields.tracking });
  } catch (e) {
    res.status(409).json({ error: "Tracking number already exists." });
  }
});

app.put("/api/shipments/:tracking", requireAdmin, (req, res) => {
  const tracking = normalizeTracking(req.params.tracking);
  const shipment = db.prepare("SELECT * FROM shipments WHERE tracking_number = ?").get(tracking);
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });

  const newStatus = String(req.body.status || shipment.status).trim();
  const newLocation = String(req.body.location || "").trim();
  const newEstimate = String(req.body.estimated_delivery || shipment.estimated_delivery || "").trim();

  db.prepare(`
    UPDATE shipments
    SET status = ?, estimated_delivery = ?, updated_at = CURRENT_TIMESTAMP
    WHERE tracking_number = ?
  `).run(newStatus, newEstimate, tracking);

  if (newStatus !== shipment.status || newLocation) {
    db.prepare(`
      INSERT INTO shipment_events (shipment_id, title, location)
      VALUES (?, ?, ?)
    `).run(shipment.id, newStatus, newLocation);
  }
  res.json({ ok: true });
});

app.delete("/api/shipments/:tracking", requireAdmin, (req, res) => {
  const tracking = normalizeTracking(req.params.tracking);
  const info = db.prepare("DELETE FROM shipments WHERE tracking_number = ?").run(tracking);
  if (!info.changes) return res.status(404).json({ error: "Shipment not found" });
  res.json({ ok: true });
});

app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/track", (req, res) => res.sendFile(path.join(__dirname, "public", "track.html")));

app.listen(PORT, () => {
  console.log(`American Eagle Freight running on http://localhost:${PORT}`);
});
