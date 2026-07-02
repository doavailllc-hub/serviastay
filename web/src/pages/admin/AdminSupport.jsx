import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/api";

const statuses = ["All", "Open", "In Progress", "Resolved", "Closed"];

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [filter, setFilter] = useState("Open");
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/support/tickets");
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Support load failed");
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (ticket) => {
    try {
      setSelected(ticket);
      setDetailsLoading(true);
      const { data } = await api.get(`/admin/support/tickets/${ticket.id}`);
      setDetails(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Ticket load failed");
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateTicket = async (patch) => {
    if (!selected) return;
    await api.put(`/admin/support/tickets/${selected.id}`, patch);
    toast.success("Ticket updated");
    await loadTickets();
    await openTicket({ ...selected, ...patch });
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;

    await api.post(`/admin/support/tickets/${selected.id}/messages`, {
      message: reply,
      internal_note: internalNote,
    });

    setReply("");
    setInternalNote(false);
    toast.success("Reply sent");
    await openTicket(selected);
  };

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const statusOk = filter === "All" || t.status === filter;
      const q = query.toLowerCase().trim();
      const searchOk =
        !q ||
        `${t.subject || ""} ${t.user_name || ""} ${t.user_email || ""}`
          .toLowerCase()
          .includes(q);

      return statusOk && searchOk;
    });
  }, [tickets, filter, query]);

  return (
    <main className="grid min-h-[calc(100vh-120px)] gap-5 lg:grid-cols-[420px_1fr]">
      <section className="rounded-[28px] border border-gray-200 bg-white p-4">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#3b71e6]">
              Support Center
            </p>
            <h1 className="text-2xl font-semibold">Tickets</h1>
          </div>

          <button
            onClick={loadTickets}
            className="rounded-full border border-gray-200 p-2 text-[#3b71e6] hover:bg-blue-50"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="mb-4 relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets..."
            className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-4 text-sm outline-none focus:border-[#3b71e6]"
          />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                filter === s
                  ? "bg-[#3b71e6] text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="animate-spin text-[#3b71e6]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-10 text-center text-sm text-gray-500">
            No tickets found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className={`w-full rounded-2xl border p-4 text-left transition hover:border-[#3b71e6] ${
                  selected?.id === ticket.id
                    ? "border-[#3b71e6] bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex justify-between gap-3">
                  <h3 className="font-semibold">{ticket.subject}</h3>
                  <PriorityBadge value={ticket.priority} />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {ticket.user_name || ticket.user_email || "Unknown user"}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <StatusBadge value={ticket.status} />
                  <span className="text-xs text-gray-400">
                    #{ticket.id}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white">
        {!selected ? (
          <div className="flex h-full min-h-[500px] items-center justify-center p-10 text-center">
            <div>
              <MessageSquare
                className="mx-auto mb-4 text-[#3b71e6]"
                size={40}
              />
              <h2 className="text-xl font-semibold">Select a ticket</h2>
              <p className="mt-2 text-sm text-gray-500">
                Open a support ticket to view conversation and actions.
              </p>
            </div>
          </div>
        ) : detailsLoading ? (
          <div className="flex h-full min-h-[500px] items-center justify-center">
            <Loader2 className="animate-spin text-[#3b71e6]" size={34} />
          </div>
        ) : (
          <div className="flex h-full min-h-[700px] flex-col">
            <header className="border-b border-gray-200 p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-semibold">
                    {details?.ticket?.subject}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {details?.ticket?.user_name} · {details?.ticket?.user_email}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={details?.ticket?.status}
                    onChange={(e) => updateTicket({ status: e.target.value })}
                    className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                  >
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                    <option>Closed</option>
                  </select>

                  <select
                    value={details?.ticket?.priority}
                    onChange={(e) => updateTicket({ priority: e.target.value })}
                    className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-5">
              {(details?.messages || []).map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.internal_note
                      ? "border border-yellow-200 bg-yellow-50"
                      : msg.sender_role === "admin"
                      ? "ml-auto bg-[#3b71e6] text-white"
                      : "bg-white"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                    {msg.internal_note ? (
                      <AlertCircle size={14} />
                    ) : msg.sender_role === "admin" ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <MessageSquare size={14} />
                    )}
                    {msg.internal_note ? "Internal note" : msg.sender_role}
                  </div>

                  <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                </div>
              ))}
            </div>

            <footer className="border-t border-gray-200 p-5">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                placeholder="Write reply or internal note..."
                className="w-full resize-none rounded-2xl border border-gray-200 p-4 text-sm outline-none focus:border-[#3b71e6]"
              />

              <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <input
                    type="checkbox"
                    checked={internalNote}
                    onChange={(e) => setInternalNote(e.target.checked)}
                  />
                  Internal note only
                </label>

                <button
                  onClick={sendReply}
                  disabled={!reply.trim()}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Send size={16} />
                  Send
                </button>
              </div>
            </footer>
          </div>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ value }) {
  const styles = {
    Open: "bg-blue-50 text-blue-700 border-blue-200",
    "In Progress": "bg-yellow-50 text-yellow-700 border-yellow-200",
    Resolved: "bg-green-50 text-green-700 border-green-200",
    Closed: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[value] || styles.Open}`}>
      {value}
    </span>
  );
}

function PriorityBadge({ value }) {
  const styles = {
    Low: "bg-gray-50 text-gray-600",
    Medium: "bg-blue-50 text-blue-700",
    High: "bg-orange-50 text-orange-700",
    Urgent: "bg-red-50 text-red-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[value] || styles.Medium}`}>
      {value}
    </span>
  );
}