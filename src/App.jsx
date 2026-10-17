import React, { useState, useEffect } from "react";
import {
  Layers,
  LayoutDashboard,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
  Upload,
  History,
  Bell,
  Plus,
  Search,
  Download,
  X,
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import seed from "./seed.json";
import { fields, pending, overdue, validate, nextId, group } from "./domain";
const nav = [
  ["Management Dashboard", LayoutDashboard],
  ["Service Log", ClipboardList],
  ["Client Summary", Users],
  ["Director Dashboard", BarChart3],
  ["Master Lists", Settings],
  ["Import / Export", Upload],
  ["Activity History", History],
  ["Notifications", Bell],
];
const maps = {
  location: "Location",
  area: "Area",
  category: "Product Category",
  issueType: "Issue Type",
  rootCause: "Root Cause",
  responsibility: "Responsibility",
  priority: "Priority",
  assignedTo: "Assigned To",
  status: "Status",
};
const palette = ["#15b8a6", "#5678ee", "#f4b44d", "#ac8af2", "#ee7183"];
const date = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "Not set");
const byClient = (rows) =>
  rows.reduce((a, s) => {
    (a[s.clientName] ??= []).push(s);
    return a;
  }, {});
function Badge({ v }) {
  return (
    <span className={"badge " + (v || "").toLowerCase().replaceAll(" ", "-")}>
      {v || "Unspecified"}
    </span>
  );
}
function Chart({ title, rows, field, pie, onPick }) {
  const d = group(rows, field);
  return (
    <section className="card chart">
      <div className="card-title">
        <h3>{title}</h3>
        <span>{rows.length} requests</span>
      </div>
      {d.length ? (
        <ResponsiveContainer width="100%" height={230}>
          {pie ? (
            <PieChart>
              <Pie
                data={d}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                onClick={(x) => onPick?.(x.name)}
              >
                {d.map((x, i) => (
                  <Cell key={x.name} fill={palette[i % 5]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : (
            <BarChart data={d} margin={{ left: -20, right: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="value"
                fill="#5678ee"
                radius={[5, 5, 0, 0]}
                onClick={(x) => onPick?.(x.name)}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      ) : (
        <div className="empty">No matching data</div>
      )}
      {pie && (
        <div className="legend">
          {d.map((x, i) => (
            <button key={x.name} onClick={() => onPick?.(x.name)}>
              <i style={{ background: palette[i % 5] }} />
              {x.name}
              <b>{x.value}</b>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
export default function App() {
  const [user, U] = useState(() =>
      JSON.parse(sessionStorage.getItem("st-user") || "null"),
    ),
    [role, R] = useState("Management"),
    [page, P] = useState("Management Dashboard");
  const [data, D] = useState(() => {
      try {
        return (
          JSON.parse(localStorage.getItem("st-data")) || structuredClone(seed)
        );
      } catch {
        return structuredClone(seed);
      }
    }),
    [mode, M] = useState("Loading"),
    [rev, V] = useState(0),
    [busy, B] = useState(false),
    [toast, T] = useState("");
  const [q, Q] = useState(""),
    [status, S] = useState(""),
    [priority, PR] = useState(""),
    [location, L] = useState(""),
    [category, C] = useState(""),
    [scope, SC] = useState(""),
    [from, F] = useState(""),
    [to, TO] = useState(""),
    [pg, PG] = useState(1),
    [sort, SO] = useState("newest");
  const [editor, E] = useState(null),
    [detail, DT] = useState(null),
    [errors, ER] = useState([]),
    [master, MS] = useState("Location"),
    [value, VA] = useState(""),
    [preview, PV] = useState(null);
  useEffect(() => {
    fetch("/api/state")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((r) => {
        D(r.state);
        V(r.revision);
        M("Node API");
      })
      .catch(() => M("Browser storage"));
  }, []);
  useEffect(() => {
    const t = setTimeout(() => T(""), 6500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(
    () => PG(1),
    [q, status, priority, location, category, scope, from, to],
  );
  const editAllowed = ["Management", "Administrator", "Service Team"].includes(
      user?.role,
    ),
    admin = ["Management", "Administrator"].includes(user?.role);
  const rows = data.services
    .filter(
      (s) =>
        (!q ||
          [s.serviceId, s.clientName, s.product, s.description, s.assignedTo]
            .join(" ")
            .toLowerCase()
            .includes(q.toLowerCase())) &&
        (!status || s.status === status) &&
        (!priority || s.priority === priority) &&
        (!location || s.location === location) &&
        (!category || (s.category || "Unspecified") === category) &&
        (!from || s.raisedAt.slice(0, 10) >= from) &&
        (!to || s.raisedAt.slice(0, 10) <= to) &&
        (!scope ||
          (scope === "pending"
            ? pending(s)
            : scope === "overdue"
              ? overdue(s)
              : ["Completed", "Closed"].includes(s.status))),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? a.raisedAt.localeCompare(b.raisedAt)
        : sort === "client"
          ? a.clientName.localeCompare(b.clientName)
          : b.raisedAt.localeCompare(a.raisedAt),
    );
  const open = rows.filter(pending),
    late = rows.filter((s) => overdue(s)),
    resolved = rows.filter((s) => ["Completed", "Closed"].includes(s.status));
  const notices = [
    ...data.notifications,
    ...data.services
      .filter((s) => overdue(s))
      .map((s) => ({
        id: s.serviceId,
        title: "Overdue request",
        body: `${s.serviceId} · ${s.clientName} · Target ${date(s.targetDate)}`,
      })),
  ];
  async function commit(next, msg) {
    B(true);
    try {
      if (mode === "Loading") throw Error("Wait for storage connection");
      if (mode === "Node API") {
        const r = await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: next, revision: rev }),
        });
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        V(b.revision);
      } else localStorage.setItem("st-data", JSON.stringify(next));
      D(next);
      T(msg);
      return true;
    } catch (e) {
      T("Save failed: " + e.message);
      return false;
    } finally {
      B(false);
    }
  }
  const event = (action, id = "System") => ({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor: user.name,
    role: user.role,
    action,
    serviceId: id,
  });
  function clear() {
    Q("");
    S("");
    PR("");
    L("");
    C("");
    SC("");
    F("");
    TO("");
  }
  function edit(s) {
    ER([]);
    E(
      s
        ? { ...s, existing: true }
        : {
            ...Object.fromEntries(fields.map(([k]) => [k, ""])),
            serviceId: nextId(data.services),
            status: "Open",
            priority: "Medium",
            repeat: "NO",
            raisedAt: new Date().toISOString().slice(0, 16),
          },
    );
  }
  async function save(e) {
    e.preventDefault();
    const s = { ...editor };
    delete s.existing;
    const err = validate(s);
    if (err.length) return ER(err);
    const old = data.services.find((x) => x.serviceId === s.serviceId);
    if (
      old &&
      ["Completed", "Closed"].includes(old.status) &&
      pending(s) &&
      !s.remarks.trim()
    )
      return ER(["Enter reopening reason in Remarks"]);
    if (["Completed", "Closed"].includes(s.status) && !s.completedAt)
      s.completedAt = new Date().toISOString().slice(0, 19);
    if (old && ["Completed", "Closed"].includes(old.status) && pending(s))
      s.completedAt = "";
    if (s.assignedTo && !s.assignedAt)
      s.assignedAt = new Date().toISOString().slice(0, 19);
    const next = {
      ...data,
      services: old
        ? data.services.map((x) => (x.serviceId === s.serviceId ? s : x))
        : [...data.services, s],
      history: [
        event(
          old
            ? `Updated request: ${old.status} → ${s.status}`
            : "Created request",
          s.serviceId,
        ),
        ...data.history,
      ],
      notifications:
        s.assignedTo && s.assignedTo !== old?.assignedTo
          ? [
              {
                id: crypto.randomUUID(),
                title: "Assignment updated",
                body: `${s.serviceId} assigned to ${s.assignedTo}`,
              },
              ...data.notifications,
            ]
          : data.notifications,
    };
    if (await commit(next, "Service request saved")) E(null);
  }
  async function exportFile() {
    try {
      const { default: ExcelJS } = await import("exceljs");
      const w = new ExcelJS.Workbook();
      const s = w.addWorksheet("SERVICE LOG");
      s.addRow(fields.map((f) => f[1]));
      rows.forEach((r) => s.addRow(fields.map(([k]) => r[k] || "")));
      const c = w.addWorksheet("CLIENT SUMMARY");
      c.addRow([
        "Client Name",
        "Total",
        "Pending",
        "Resolved",
        "Repeat",
        "Last Raised",
        "Latest Status",
      ]);
      Object.entries(byClient(rows)).forEach(([name, a]) => {
        const last = [...a].sort((x, y) =>
          y.raisedAt.localeCompare(x.raisedAt),
        )[0];
        c.addRow([
          name,
          a.length,
          a.filter(pending).length,
          a.filter((s) => ["Completed", "Closed"].includes(s.status)).length,
          a.filter((s) => s.repeat === "YES").length,
          last.raisedAt,
          last.status,
        ]);
      });
      for (const name of ["DIRECTOR DASHBOARD", "MANAGEMENT DASHBOARD"]) {
        const s = w.addWorksheet(name);
        s.addRows([
          ["Metric", "Value"],
          ["Total", rows.length],
          ["Pending", open.length],
          ["Overdue", late.length],
          ["Resolved", resolved.length],
          ["Repeat", rows.filter((s) => s.repeat === "YES").length],
        ]);
        for (const k of ["category", "status", "rootCause", "responsibility"]) {
          s.addRow([]);
          s.addRow([k, "Count"]);
          group(rows, k).forEach((d) => s.addRow([d.name, d.value]));
        }
      }
      const l = w.addWorksheet("LISTS");
      l.addRow(Object.keys(data.lists));
      for (
        let i = 0;
        i < Math.max(...Object.values(data.lists).map((a) => a.length));
        i++
      )
        l.addRow(Object.values(data.lists).map((a) => a[i] || ""));
      w.eachSheet((s) => {
        s.columns.forEach((c) => (c.width = 24));
        s.getRow(1).font = { bold: true };
        s.views = [{ state: "frozen", ySplit: 1 }];
      });
      const url = URL.createObjectURL(
        new Blob([await w.xlsx.writeBuffer()], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "Service-Tracker-Export.xlsx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      T("Five-sheet report exported");
    } catch (e) {
      T("Export failed: " + e.message);
    }
  }
  async function importFile(file) {
    if (!file) return;
    try {
      if (file.size > 10485760) throw Error("Maximum size is 10 MB");
      const { default: ExcelJS } = await import("exceljs");
      const w = new ExcelJS.Workbook();
      await w.xlsx.load(await file.arrayBuffer());
      const s = w.getWorksheet("SERVICE LOG");
      if (!s) throw Error("SERVICE LOG sheet is required");
      const text = (v) =>
        v instanceof Date
          ? v.toISOString().slice(0, 19)
          : typeof v === "object" && v
            ? String(v.result ?? v.text ?? "")
            : String(v ?? "").trim();
      const h = {};
      s.getRow(1).eachCell((c, i) => (h[text(c.value)] = i));
      fields.forEach(([, label]) => {
        if (!h[label]) throw Error("Missing column: " + label);
      });
      const valid = [],
        issues = [],
        seen = new Set(data.services.map((s) => s.serviceId));
      s.eachRow((r, i) => {
        if (i === 1 || !text(r.getCell(h["Service ID"]).value)) return;
        const item = Object.fromEntries(
          fields.map(([k, label]) => [k, text(r.getCell(h[label]).value)]),
        );
        const err = validate(item);
        for (const [k, list] of Object.entries(maps))
          if (item[k] && !data.lists[list].includes(item[k]))
            err.push("Unknown " + list + ": " + item[k]);
        if (seen.has(item.serviceId)) err.push("Duplicate Service ID");
        seen.add(item.serviceId);
        if (err.length)
          issues.push({ row: i, id: item.serviceId, errors: err });
        else valid.push(item);
      });
      PV({ valid, issues });
      T("Preview ready. Existing records will not be overwritten.");
    } catch (e) {
      T("Import failed: " + e.message);
    }
  }
  if (!user)
    return (
      <div className="login">
        <div className="login-story">
          <div className="brand">
            <Layers /> SERVICE TRACKER
          </div>
          <span className="eyebrow">OPERATIONS, CONNECTED</span>
          <h1>
            Every request.
            <br />A clear path
            <br />
            <em>to resolution.</em>
          </h1>
          <p>
            Your service log, client history and operational insights. Together
            in one workspace.
          </p>
          <small>React + Vite · Node.js demo application</small>
        </div>
        <form
          className="login-card"
          onSubmit={(e) => {
            e.preventDefault();
            const u = { name: "Demo User", role };
            U(u);
            sessionStorage.setItem("st-user", JSON.stringify(u));
          }}
        >
          <div className="logo-square">
            <Layers />
          </div>
          <h2>Welcome to your workspace</h2>
          <p>Choose a role to explore the demo.</p>
          <label>
            Demo role
            <select value={role} onChange={(e) => R(e.target.value)}>
              {[
                "Management",
                "Director",
                "Service Team",
                "Administrator",
                "Viewer",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button className="primary">
            Enter workspace <ArrowUpRight size={18} />
          </button>
          <div className="notice">
            Role simulation only, not password authentication. Run locally. Do
            not deploy publicly.
          </div>
        </form>
      </div>
    );
  const table = (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {[
              "Service / client",
              "Location / product",
              "Priority",
              "Assigned to",
              "Status",
              "Target date",
              "",
            ].map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice((pg - 1) * 8, pg * 8).map((s) => (
            <tr key={s.serviceId}>
              <td>
                <button className="link" onClick={() => DT(s)}>
                  {s.serviceId}
                </button>
                <strong>{s.clientName}</strong>
              </td>
              <td>
                {s.location}
                <small>{s.product || "Product not specified"}</small>
              </td>
              <td>
                <Badge v={s.priority} />
              </td>
              <td>{s.assignedTo || "Unassigned"}</td>
              <td>
                <Badge v={s.status} />
              </td>
              <td className={overdue(s) ? "danger" : ""}>
                {date(s.targetDate)}
                {overdue(s) && <small>Overdue</small>}
              </td>
              <td>
                <button
                  aria-label={"View " + s.serviceId}
                  className="icon"
                  onClick={() => DT(s)}
                >
                  <ArrowUpRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="empty">No matching service requests.</div>
      )}
      <div className="pagination">
        <span>
          {rows.length} requests · Page {pg} of{" "}
          {Math.max(1, Math.ceil(rows.length / 8))}
        </span>
        <div>
          <button disabled={pg === 1} onClick={() => PG(pg - 1)}>
            Previous
          </button>
          <button disabled={pg * 8 >= rows.length} onClick={() => PG(pg + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="logo-square">
            <Layers />
          </div>
          <div>
            Service Tracker<small>OPERATIONS WORKSPACE</small>
          </div>
        </div>
        <div className="workspace">
          <span className="dot" /> Service operations{" "}
          <span className="tag">DEMO</span>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {nav
            .filter(([n]) => n !== "Master Lists" || admin)
            .map(([n, Icon]) => (
              <button
                key={n}
                className={page === n ? "active" : ""}
                onClick={() => {
                  P(n);
                  PG(1);
                }}
              >
                <Icon size={18} />
                {n}
                {n === "Notifications" && <b>{notices.length}</b>}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="storage">
            <span className="dot" />
            {mode}
            <small>Local demo persistence</small>
          </div>
          <div className="profile">
            <div className="avatar">DU</div>
            <div>
              {user.name}
              <small>{user.role}</small>
            </div>
            <button
              aria-label="Sign out"
              onClick={() => {
                sessionStorage.removeItem("st-user");
                U(null);
                P("Management Dashboard");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            Workspace / <b>{page}</b>
          </div>
          <div className="header-right">
            <span className="demo-pill">LOCAL DEMO</span>
            <button
              className="icon"
              aria-label="Notifications"
              onClick={() => P("Notifications")}
            >
              <Bell size={19} />
              <i>{notices.length}</i>
            </button>
            <div className="avatar">DU</div>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">SERVICE OPERATIONS</span>
              <h1>{page}</h1>
              <p>
                A clear view of your service performance and what needs
                attention.
              </p>
            </div>
            <div className="actions">
              <button onClick={exportFile}>
                <Download size={16} /> Export report
              </button>
              {editAllowed && (
                <button className="primary" onClick={() => edit()}>
                  <Plus size={17} /> New service
                </button>
              )}
            </div>
          </div>
          {[
            "Management Dashboard",
            "Director Dashboard",
            "Service Log",
            "Client Summary",
          ].includes(page) && (
            <div className="filters">
              <div className="search">
                <Search size={16} />
                <input
                  aria-label="Search services"
                  placeholder="Search requests, clients, products..."
                  value={q}
                  onChange={(e) => Q(e.target.value)}
                />
              </div>
              {[
                [status, S, "Status"],
                [priority, PR, "Priority"],
                [location, L, "Location"],
              ].map(([v, set, list]) => (
                <select
                  aria-label={list + " filter"}
                  key={list}
                  value={v}
                  onChange={(e) => set(e.target.value)}
                >
                  <option value="">All {list.toLowerCase()}</option>
                  {data.lists[list].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              ))}
              <input
                type="date"
                aria-label="Raised from"
                value={from}
                onChange={(e) => F(e.target.value)}
              />
              <input
                type="date"
                aria-label="Raised to"
                value={to}
                onChange={(e) => TO(e.target.value)}
              />
              <select
                aria-label="Sort requests"
                value={sort}
                onChange={(e) => {
                  SO(e.target.value);
                  PG(1);
                }}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="client">Client name</option>
              </select>
              <button onClick={clear}>Reset</button>
              {(scope || category) && (
                <span className="tag">
                  {scope} {category}
                </span>
              )}
            </div>
          )}
          {page.includes("Dashboard") && (
            <>
              <div className="kpis">
                {[
                  [
                    "Total requests",
                    rows.length,
                    "blue",
                    "All matching requests",
                    "",
                  ],
                  [
                    "Pending requests",
                    open.length,
                    "amber",
                    "Includes waiting statuses",
                    "pending",
                  ],
                  [
                    "Overdue",
                    late.length,
                    "red",
                    "Target date has passed",
                    "overdue",
                  ],
                  [
                    "Completed / closed",
                    resolved.length,
                    "teal",
                    "Resolved service requests",
                    "resolved",
                  ],
                ].map(([label, n, color, sub, filter]) => (
                  <button
                    className={"kpi " + color}
                    key={label}
                    onClick={() => {
                      SC(filter);
                      P("Service Log");
                    }}
                  >
                    <div>
                      <span>{label}</span>
                      <ArrowUpRight size={18} />
                    </div>
                    <b>{n}</b>
                    <small>{sub}</small>
                  </button>
                ))}
              </div>
              <div className="insight">
                <div>
                  <strong>{late.length} overdue requests need attention</strong>
                  <span>
                    {open.filter((s) => !s.targetDate).length} pending without
                    target · {rows.filter((s) => s.repeat === "YES").length}{" "}
                    repeat issues ·{" "}
                    {
                      rows.filter(
                        (s) => s.priority === "Critical" && pending(s),
                      ).length
                    }{" "}
                    critical pending ·{" "}
                    {
                      rows.filter((s) => s.priority === "High" && pending(s))
                        .length
                    }{" "}
                    high pending ·{" "}
                    {
                      rows.filter(
                        (s) =>
                          s.completedAt?.slice(0, 7) ===
                          new Date().toISOString().slice(0, 7),
                      ).length
                    }{" "}
                    completed this month ·{" "}
                    {
                      Object.values(byClient(rows)).filter((a) => a.length > 1)
                        .length
                    }{" "}
                    repeat clients
                  </span>
                </div>
                <button
                  onClick={() => {
                    SC("overdue");
                    P("Service Log");
                  }}
                >
                  Review requests <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="chart-grid">
                <Chart
                  title="Requests by product category"
                  rows={rows}
                  field="category"
                  pie
                  onPick={(v) => {
                    C(v);
                    P("Service Log");
                  }}
                />
                <Chart
                  title="Requests by status"
                  rows={rows}
                  field="status"
                  onPick={(v) => {
                    S(v);
                    P("Service Log");
                  }}
                />
                {page === "Director Dashboard" && (
                  <>
                    <Chart
                      title="Root cause analysis"
                      rows={rows}
                      field="rootCause"
                    />
                    <Chart
                      title="Responsibility breakdown"
                      rows={rows}
                      field="responsibility"
                    />
                    <Chart
                      title="Monthly requests raised"
                      rows={rows.map((s) => ({
                        ...s,
                        month: s.raisedAt.slice(0, 7) || "Unknown",
                      }))}
                      field="month"
                    />
                    <Chart
                      title="Requests by priority"
                      rows={rows}
                      field="priority"
                      onPick={(v) => {
                        PR(v);
                        P("Service Log");
                      }}
                    />
                  </>
                )}
              </div>
              <section className="card">
                <div className="card-title">
                  <div>
                    <h3>Service overview</h3>
                    <p>Requests and current ownership</p>
                  </div>
                  <button className="link" onClick={() => P("Service Log")}>
                    View all requests <ArrowUpRight size={15} />
                  </button>
                </div>
                {table}
              </section>
              <p className="footnote">
                Overdue = unresolved with target date before today (UTC date).
                Waiting does not pause the clock. All metrics use the active
                filters.
              </p>
            </>
          )}
          {page === "Service Log" && (
            <section className="card">
              <div className="card-title">
                <h3>
                  Service register <span className="count">{rows.length}</span>
                </h3>
                <select
                  aria-label="Request scope"
                  value={scope}
                  onChange={(e) => SC(e.target.value)}
                >
                  <option value="">All requests</option>
                  <option value="pending">Pending only</option>
                  <option value="overdue">Overdue only</option>
                  <option value="resolved">Resolved only</option>
                </select>
              </div>
              {table}
            </section>
          )}
          {page === "Client Summary" && (
            <div className="client-grid">
              {Object.entries(byClient(rows)).map(([name, a]) => {
                const last = [...a].sort((x, y) =>
                  y.raisedAt.localeCompare(x.raisedAt),
                )[0];
                return (
                  <section className="card client" key={name}>
                    <div className="client-head">
                      <div className="avatar">
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3>{name}</h3>
                        <p>{last.location}</p>
                      </div>
                    </div>
                    <div className="client-stats">
                      {[
                        ["Total", a.length],
                        ["Pending", a.filter(pending).length],
                        [
                          "Resolved",
                          a.filter((s) =>
                            ["Completed", "Closed"].includes(s.status),
                          ).length,
                        ],
                        ["Repeat", a.filter((s) => s.repeat === "YES").length],
                      ].map(([k, n]) => (
                        <div key={k}>
                          <b>{n}</b>
                          {k}
                        </div>
                      ))}
                    </div>
                    <p>Last raised: {date(last.raisedAt)}</p>
                    <Badge v={last.status} />
                    <button
                      className="link client-link"
                      onClick={() => {
                        Q(name);
                        P("Service Log");
                      }}
                    >
                      View service history <ArrowUpRight size={15} />
                    </button>
                  </section>
                );
              })}
              {!rows.length && (
                <div className="empty">No matching clients.</div>
              )}
            </div>
          )}
          {page === "Master Lists" && admin && (
            <section className="card">
              <div className="card-title">
                <h3>Dropdown configuration</h3>
                <span>Applies to new and edited requests</span>
              </div>
              <div className="master-layout">
                <div className="master-nav">
                  {Object.keys(data.lists).map((k) => (
                    <button
                      key={k}
                      className={master === k ? "selected" : ""}
                      onClick={() => MS(k)}
                    >
                      {k}
                      <span>{data.lists[k].length}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <h3>{master}</h3>
                  <form
                    className="inline-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const v = value.trim();
                      if (
                        !v ||
                        data.lists[master].some(
                          (x) => x.toLowerCase() === v.toLowerCase(),
                        )
                      )
                        return T("Enter a unique value");
                      if (
                        await commit(
                          {
                            ...data,
                            lists: {
                              ...data.lists,
                              [master]: [...data.lists[master], v],
                            },
                            history: [
                              event(`Added ${master}: ${v}`),
                              ...data.history,
                            ],
                          },
                          "Master value added",
                        )
                      )
                        VA("");
                    }}
                  >
                    <input
                      aria-label="New master value"
                      value={value}
                      onChange={(e) => VA(e.target.value)}
                      placeholder="Add a new value"
                    />
                    <button className="primary" disabled={busy}>
                      Add value
                    </button>
                  </form>
                  <div className="value-list">
                    {data.lists[master].map((v) => (
                      <div key={v}>
                        {v}
                        <span className="tag">ACTIVE</span>
                      </div>
                    ))}
                  </div>
                  <p className="footnote">
                    Additive master lists preserve existing references. Removal
                    is not enabled.
                  </p>
                </div>
              </div>
            </section>
          )}
          {page === "Import / Export" && (
            <>
              <div className="chart-grid">
                <section className="card import-card">
                  <div className="logo-square">
                    <Upload />
                  </div>
                  <h2>Bring your workbook in</h2>
                  <p>
                    Upload an .xlsx workbook with a SERVICE LOG sheet. Preview
                    row-level errors before importing.
                  </p>
                  {admin ? (
                    <label className="upload-zone">
                      <Upload />
                      <strong>Choose Excel workbook</strong>
                      <span>.xlsx · up to 10 MB</span>
                      <input
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => importFile(e.target.files[0])}
                      />
                    </label>
                  ) : (
                    <div className="notice">
                      Management or Administrator role required for import.
                    </div>
                  )}
                  <p className="footnote">
                    Append-only. Duplicate IDs and invalid rows are excluded.
                    Master lists are not imported.
                  </p>
                </section>
                <section className="card import-card">
                  <div className="logo-square">
                    <Download />
                  </div>
                  <h2>Export a complete report</h2>
                  <p>Export current filtered data to five sheets.</p>
                  <ul>
                    {[
                      "Service Log: all 22 fields",
                      "Client Summary",
                      "Director Dashboard metrics",
                      "Management Dashboard metrics",
                      "Master Lists",
                    ].map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <button className="primary" onClick={exportFile}>
                    <Download size={16} /> Export Excel workbook
                  </button>
                  <p className="footnote">
                    Data tables only; original Excel chart formatting is not
                    reproduced.
                  </p>
                </section>
              </div>
              {preview && (
                <section className="card">
                  <div className="card-title">
                    <h3>Import preview</h3>
                    <span>
                      {preview.valid.length} valid · {preview.issues.length}{" "}
                      excluded
                    </span>
                  </div>
                  <div className="pad">
                    {preview.issues.map((i) => (
                      <div className="notice error" key={i.row}>
                        Row {i.row} · {i.id}: {i.errors.join("; ")}
                      </div>
                    ))}
                    {preview.valid.map((s) => (
                      <p key={s.serviceId}>
                        {s.serviceId} · {s.clientName} · {s.status}
                      </p>
                    ))}
                    <button
                      className="primary"
                      disabled={!preview.valid.length || busy}
                      onClick={async () => {
                        if (
                          await commit(
                            {
                              ...data,
                              services: [...data.services, ...preview.valid],
                              history: [
                                event(
                                  `Imported ${preview.valid.length} requests`,
                                ),
                                ...data.history,
                              ],
                            },
                            "Valid rows imported",
                          )
                        )
                          PV(null);
                      }}
                    >
                      Import {preview.valid.length} valid requests
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
          {page === "Activity History" && (
            <section className="card">
              <div className="card-title">
                <h3>Activity timeline</h3>
                <span>Demo changes only</span>
              </div>
              {!data.history.length ? (
                <div className="empty">
                  No changes yet. Create or update a request to begin.
                </div>
              ) : (
                data.history.map((h) => (
                  <div className="timeline" key={h.id}>
                    <div className="timeline-dot" />
                    <div>
                      <strong>{h.action}</strong>
                      <p>
                        {h.serviceId} · {h.actor} · {h.role}
                      </p>
                      <small>{new Date(h.at).toLocaleString("en-IN")}</small>
                    </div>
                  </div>
                ))
              )}
            </section>
          )}
          {page === "Notifications" && (
            <section className="card">
              <div className="card-title">
                <h3>Notification centre</h3>
                <span>In-app demo only</span>
              </div>
              {notices.length ? (
                notices.map((n) => (
                  <div className="notification" key={n.id}>
                    <Bell size={20} />
                    <div>
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">No notifications.</div>
              )}
              <div className="notice">
                Email, background scheduling and escalation delivery are not
                connected. Overdue reminders are calculated on UI render.
              </div>
            </section>
          )}
          <footer>
            Service Tracker <span>Workbook-powered demo · {mode}</span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="Dismiss" onClick={() => T("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {editor && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Service request form"
          >
            <div className="card-title">
              <div>
                <span className="eyebrow">SERVICE REQUEST</span>
                <h2>
                  {editor.existing ? "Edit request" : "Create new service"}
                </h2>
              </div>
              <button
                className="icon"
                aria-label="Close form"
                onClick={() => E(null)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={save}>
              <div className="form-body">
                {errors.length > 0 && (
                  <div className="notice error" role="alert">
                    {errors.map((e) => (
                      <div key={e}>{e}</div>
                    ))}
                  </div>
                )}
                <div className="form-grid">
                  {fields.map(([k, label]) => (
                    <label
                      key={k}
                      className={
                        ["description", "resolution", "remarks"].includes(k)
                          ? "wide"
                          : ""
                      }
                    >
                      {label}
                      {[
                        "clientName",
                        "location",
                        "description",
                        "priority",
                        "status",
                      ].includes(k) && " *"}
                      {maps[k] ? (
                        <select
                          value={editor[k] || ""}
                          onChange={(e) =>
                            E({ ...editor, [k]: e.target.value })
                          }
                        >
                          <option value="">Select {label.toLowerCase()}</option>
                          {[
                            ...new Set([
                              ...data.lists[maps[k]],
                              ...(editor[k] ? [editor[k]] : []),
                            ]),
                          ].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      ) : k === "repeat" ? (
                        <select
                          value={editor[k]}
                          onChange={(e) =>
                            E({ ...editor, [k]: e.target.value })
                          }
                        >
                          <option>NO</option>
                          <option>YES</option>
                        </select>
                      ) : ["description", "resolution", "remarks"].includes(
                          k,
                        ) ? (
                        <textarea
                          rows="3"
                          value={editor[k]}
                          onChange={(e) =>
                            E({ ...editor, [k]: e.target.value })
                          }
                        />
                      ) : (
                        <input
                          readOnly={k === "serviceId"}
                          type={
                            k === "targetDate"
                              ? "date"
                              : [
                                    "raisedAt",
                                    "assignedAt",
                                    "completedAt",
                                  ].includes(k)
                                ? "datetime-local"
                                : "text"
                          }
                          value={
                            k === "targetDate"
                              ? (editor[k] || "").slice(0, 10)
                              : [
                                    "raisedAt",
                                    "assignedAt",
                                    "completedAt",
                                  ].includes(k)
                                ? (editor[k] || "").slice(0, 16)
                                : editor[k] || ""
                          }
                          onChange={(e) =>
                            E({ ...editor, [k]: e.target.value })
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
                <label className="attachment">
                  Demo attachments (metadata only)
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      E({
                        ...editor,
                        attachments: [
                          ...(editor.attachments || []),
                          ...Array.from(e.target.files).map((f) => ({
                            name: f.name,
                            size: f.size,
                          })),
                        ],
                      })
                    }
                  />
                </label>
                {editor.attachments?.map((a, i) => (
                  <p key={i}>
                    {a.name} · {Math.ceil(a.size / 1024)} KB{" "}
                    <button
                      type="button"
                      onClick={() =>
                        E({
                          ...editor,
                          attachments: editor.attachments.filter(
                            (_, j) => i !== j,
                          ),
                        })
                      }
                    >
                      Remove
                    </button>
                  </p>
                ))}
                <p className="footnote">
                  File contents are not uploaded or retained. Only names and
                  sizes are saved. Required fields marked *.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => E(null)}>
                  Cancel
                </button>
                <button
                  className="primary"
                  disabled={busy || mode === "Loading"}
                >
                  {busy ? "Saving..." : "Save service request"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {detail && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Service request details"
          >
            <div className="card-title">
              <div>
                <span className="eyebrow">{detail.serviceId}</span>
                <h2>{detail.clientName}</h2>
              </div>
              <button
                className="icon"
                aria-label="Close details"
                onClick={() => DT(null)}
              >
                <X />
              </button>
            </div>
            <div className="form-body">
              <div className="detail-grid">
                {fields.map(([k, label]) => (
                  <div key={k}>
                    <small>{label}</small>
                    <p>{detail[k] || "Not provided"}</p>
                  </div>
                ))}
              </div>
              <h3>Attachment metadata</h3>
              {detail.attachments?.length ? (
                detail.attachments.map((a, i) => (
                  <p key={i}>
                    {a.name} · {Math.ceil(a.size / 1024)} KB
                  </p>
                ))
              ) : (
                <p>No attachment metadata.</p>
              )}
              <h3>Request history</h3>
              {data.history
                .filter((h) => h.serviceId === detail.serviceId)
                .map((h) => (
                  <p key={h.id}>
                    {h.action} · {new Date(h.at).toLocaleString()}
                  </p>
                ))}
            </div>
            <div className="modal-footer">
              <button onClick={() => DT(null)}>Close</button>
              {editAllowed && (
                <button
                  className="primary"
                  onClick={() => {
                    edit(detail);
                    DT(null);
                  }}
                >
                  Edit request
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
