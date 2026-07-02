import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Download,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/api";

const entityFilters = [
  "All",
  "host_kyc",
  "property",
  "payout",
  "ticket",
  "user",
  "settings",
];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState("All");

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/audit-logs");
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Audit logs load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const q = query.trim().toLowerCase();

      const entityOk = entity === "All" || log.entity_type === entity;

      const searchOk =
        !q ||
        `${log.action || ""} ${log.message || ""} ${log.admin_name || ""} ${
          log.admin_email || ""
        } ${log.entity_type || ""}`
          .toLowerCase()
          .includes(q);

      return entityOk && searchOk;
    });
  }, [logs, query, entity]);

  const exportCsv = () => {
    const rows = [
      ["ID", "Admin", "Email", "Action", "Entity", "Entity ID", "Message", "Date"],
      ...filtered.map((log) => [
        log.id,
        log.admin_name || "",
        log.admin_email || "",
        log.action || "",
        log.entity_type || "",
        log.entity_id || "",
        (log.message || "").replaceAll(",", " "),
        formatDate(log.created_at),
      ]),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#3b71e6]">
              <ClipboardList size={24} />
            </div>

            <div>
              <p className="text-sm font-semibold text-[#3b71e6]">
                Admin Security
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Audit Logs
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-500">
                Track all critical admin actions across KYC, payouts, settings,
                support, properties and user management.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportCsv}
              className="flex h-11 items-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Download size={16} />
              Export CSV
            </button>

            <button
              onClick={loadLogs}
              className="flex h-11 items-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-semibold text-[#3b71e6] hover:bg-blue-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat title="Total Logs" value={logs.length} />
        <Stat
          title="KYC Actions"
          value={logs.filter((l) => l.entity_type === "host_kyc").length}
        />
        <Stat
          title="Property Actions"
          value={logs.filter((l) => l.entity_type === "property").length}
        />
        <Stat
          title="Settings Updates"
          value={logs.filter((l) => l.entity_type === "settings").length}
        />
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-4">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logs, admin, action..."
              className="h-11 w-full rounded-xl border border-gray-200 pl-11 pr-4 text-sm outline-none focus:border-[#3b71e6]"
            />
          </div>

          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#3b71e6]"
          >
            {entityFilters.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-[#3b71e6]" size={34} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-12 text-center text-sm text-gray-500">
            No audit logs found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3">Action</th>
                  <th>Admin</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>Message</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100">
                    <td className="py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#3b71e6]">
                        {log.action}
                      </span>
                    </td>

                    <td>
                      <p className="font-semibold">
                        {log.admin_name || "System/Admin"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {log.admin_email || "-"}
                      </p>
                    </td>

                    <td>
                      <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                        {log.entity_type || "-"}
                      </span>
                    </td>

                    <td>#{log.entity_id || "-"}</td>

                    <td className="max-w-[360px] truncate text-gray-600">
                      {log.message || "-"}
                    </td>

                    <td className="text-gray-500">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ title, value }) {
  return (
    <article className="rounded-[22px] border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="mt-2 text-2xl font-semibold">{value}</h3>
    </article>
  );
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN");
}