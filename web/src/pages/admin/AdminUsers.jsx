import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Shield, UserCheck, UserX, Trash2 } from "lucide-react";
import api from "../../api/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/users");
      setUsers(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Users load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const text = `${user.fullname || ""} ${user.email || ""} ${user.phone || ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesRole = role === "all" || user.role === role;
      const matchesStatus =
        status === "all" || String(user.status || "active") === status;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, role, status]);

  const updateRole = async (id, newRole) => {
    await api.put(`/admin/users/${id}/role`, { role: newRole });
    loadUsers();
  };

  const updateStatus = async (id, newStatus) => {
    await api.put(`/admin/users/${id}/status`, { status: newStatus });
    loadUsers();
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user permanently?")) return;
    await api.delete(`/admin/users/${id}`);
    loadUsers();
  };

  return (
    <div>
      <PageHeader title="Users Management" subtitle="Search, filter, manage roles, activate or suspend users." onRefresh={loadUsers} />

      <Filters
        search={search}
        setSearch={setSearch}
        role={role}
        setRole={setRole}
        status={status}
        setStatus={setStatus}
      />

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <Empty text="Loading users..." />
        ) : filteredUsers.length === 0 ? (
          <Empty text="No users found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-gray-50 text-sm text-gray-500">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-bold">{user.fullname || "User"}</td>
                    <td className="p-4 text-gray-600">{user.email}</td>
                    <td className="p-4 text-gray-600">{user.phone || "-"}</td>

                    <td className="p-4">
                      <select
                        value={user.role || "guest"}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                        className="rounded-xl border px-3 py-2"
                      >
                        <option value="guest">Guest</option>
                        <option value="host">Host</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    <td className="p-4">
                      <StatusBadge status={user.status || "active"} />
                    </td>

                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(user.id, "active")} className="action-green">
                          <UserCheck size={16} />
                        </button>

                        <button onClick={() => updateStatus(user.id, "suspended")} className="action-yellow">
                          <UserX size={16} />
                        </button>

                        <button onClick={() => deleteUser(user.id)} className="action-red">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, onRefresh }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-4xl font-black text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-500">{subtitle}</p>
      </div>

      <button onClick={onRefresh} className="flex items-center gap-2 rounded-xl bg-[#8363F5] px-5 py-3 font-bold text-white">
        <RefreshCw size={18} /> Refresh
      </button>
    </div>
  );
}

function Filters({ search, setSearch, role, setRole, status, setStatus }) {
  return (
    <div className="mb-6 grid gap-4 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-4">
      <div className="flex items-center gap-3 rounded-xl border px-4">
        <Search size={18} className="text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user..." className="h-12 w-full outline-none" />
      </div>

      <select value={role} onChange={(e) => setRole(e.target.value)} className="h-12 rounded-xl border px-4">
        <option value="all">All Roles</option>
        <option value="guest">Guest</option>
        <option value="host">Host</option>
        <option value="admin">Admin</option>
      </select>

      <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 rounded-xl border px-4">
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>

      <div className="flex items-center gap-2 rounded-xl bg-[#F4F1FF] px-4 font-bold text-[#8363F5]">
        <Shield size={18} /> Admin Controls
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const style = status === "suspended" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700";
  return <span className={`rounded-full px-3 py-1 text-sm font-bold ${style}`}>{status}</span>;
}

function Empty({ text }) {
  return <div className="p-12 text-center text-gray-500">{text}</div>;
}