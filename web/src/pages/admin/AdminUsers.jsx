import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";

import api from "../../api/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

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

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const text = `${user.fullname || ""} ${user.email || ""} ${
        user.phone || ""
      }`.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (role === "all" || user.role === role) &&
        (status === "all" || String(user.status || "active") === status)
      );
    });
  }, [users, search, role, status]);

  const updateRole = async (id, newRole) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role: newRole });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Role update failed");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/admin/users/${id}/status`, { status: newStatus });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Status update failed");
    }
  };

  const deleteUser = async (id) => {
    const ok = window.confirm(
      "Are you sure you want to delete this user permanently?"
    );

    if (!ok) return;

    try {
      await api.delete(`/admin/users/${id}`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "User delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <PageHeader onRefresh={loadUsers} />

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={users.length} />
        <StatCard label="Showing" value={filteredUsers.length} />
        <StatCard
          label="Filter"
          value={filteredUsers.length === users.length ? "None" : "Applied"}
        />
        <StatCard label="Access control" value="Live" />
      </section>

      <Filters
        search={search}
        setSearch={setSearch}
        role={role}
        setRole={setRole}
        status={status}
        setStatus={setStatus}
      />

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
            Users
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage user roles, account status and access control.
          </p>
        </div>

        {loading ? (
          <Empty text="Loading users..." />
        ) : filteredUsers.length === 0 ? (
          <Empty text="No users found." />
        ) : (
          <>
            <DesktopTable
              users={filteredUsers}
              updateRole={updateRole}
              updateStatus={updateStatus}
              deleteUser={deleteUser}
            />

            <MobileCards
              users={filteredUsers}
              updateRole={updateRole}
              updateStatus={updateStatus}
              deleteUser={deleteUser}
            />
          </>
        )}
      </section>
    </div>
  );
}

function PageHeader({ onRefresh }) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">Admin</p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
          Users
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          Search, filter, manage roles and control user account access.
        </p>
      </div>

      <button
        onClick={onRefresh}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
      >
        <RefreshCw size={17} />
        Refresh
      </button>
    </header>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>

      <h3 className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
        {value}
      </h3>
    </article>
  );
}

function Filters({ search, setSearch, role, setRole, status, setStatus }) {
  return (
    <section className="mb-6 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 lg:grid-cols-[1fr_180px_180px]">
      <SearchBox
        value={search}
        setValue={setSearch}
        placeholder="Search by name, email or phone..."
      />

      <SelectBox value={role} onChange={setRole}>
        <option value="all">All roles</option>
        <option value="guest">Guest</option>
        <option value="host">Host</option>
        <option value="admin">Admin</option>
      </SelectBox>

      <SelectBox value={status} onChange={setStatus}>
        <option value="all">All status</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </SelectBox>
    </section>
  );
}

function SearchBox({ value, setValue, placeholder }) {
  return (
    <div className="flex h-11 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 transition focus-within:border-[#3b71e6] focus-within:ring-2 focus-within:ring-[#3b71e6]/10">
      <Search size={17} className="text-gray-400" />

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
      />
    </div>
  );
}

function SelectBox({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
    >
      {children}
    </select>
  );
}

function DesktopTable({ users, updateRole, updateStatus, deleteUser }) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[980px] text-left">
        <thead className="border-b border-gray-200 text-sm text-gray-500">
          <tr>
            <th className="px-5 py-4 font-medium">User</th>
            <th className="px-5 py-4 font-medium">Email</th>
            <th className="px-5 py-4 font-medium">Phone</th>
            <th className="px-5 py-4 font-medium">Role</th>
            <th className="px-5 py-4 font-medium">Status</th>
            <th className="px-5 py-4 text-right font-medium">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="transition hover:bg-gray-50">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <Avatar name={user.fullname || "User"} />

                  <div>
                    <p className="text-sm font-semibold text-gray-950">
                      {user.fullname || "User"}
                    </p>

                    <p className="text-xs text-gray-400">ID: {user.id}</p>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={15} />
                  {user.email || "-"}
                </div>
              </td>

              <td className="px-5 py-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={15} />
                  {user.phone || "-"}
                </div>
              </td>

              <td className="px-5 py-4">
                <RoleSelect
                  value={user.role || "guest"}
                  onChange={(value) => updateRole(user.id, value)}
                />
              </td>

              <td className="px-5 py-4">
                <StatusBadge status={user.status || "active"} />
              </td>

              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <IconButton
                    title="Activate"
                    onClick={() => updateStatus(user.id, "active")}
                    className="border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <UserCheck size={16} />
                  </IconButton>

                  <IconButton
                    title="Suspend"
                    onClick={() => updateStatus(user.id, "suspended")}
                    className="border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                  >
                    <UserX size={16} />
                  </IconButton>

                  <IconButton
                    title="Delete"
                    onClick={() => deleteUser(user.id)}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileCards({ users, updateRole, updateStatus, deleteUser }) {
  return (
    <div className="divide-y divide-gray-100 lg:hidden">
      {users.map((user) => (
        <div key={user.id} className="p-5">
          <div className="mb-4 flex items-start gap-3">
            <Avatar name={user.fullname || "User"} />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-950">
                {user.fullname || "User"}
              </p>

              <p className="truncate text-sm text-gray-500">
                {user.email || "-"}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {user.phone || "-"}
              </p>
            </div>

            <StatusBadge status={user.status || "active"} />
          </div>

          <div className="mb-4">
            <RoleSelect
              value={user.role || "guest"}
              onChange={(value) => updateRole(user.id, value)}
              fullWidth
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ActionButton
              onClick={() => updateStatus(user.id, "active")}
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <UserCheck size={15} />
              Active
            </ActionButton>

            <ActionButton
              onClick={() => updateStatus(user.id, "suspended")}
              className="border-yellow-200 text-yellow-700 hover:bg-yellow-50"
            >
              <UserX size={15} />
              Suspend
            </ActionButton>

            <ActionButton
              onClick={() => deleteUser(user.id)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} />
              Delete
            </ActionButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ name }) {
  const letter = name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef4ff] text-sm font-semibold text-[#3b71e6]">
      {letter}
    </div>
  );
}

function RoleSelect({ value, onChange, fullWidth = false }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm capitalize outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      <option value="guest">Guest</option>
      <option value="host">Host</option>
      <option value="admin">Admin</option>
    </select>
  );
}

function IconButton({ children, onClick, className, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition ${className}`}
    >
      {children}
    </button>
  );
}

function ActionButton({ children, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-1 rounded-xl border text-xs font-medium transition ${className}`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const value = status || "active";

  const style =
    value === "suspended"
      ? "border-red-200 bg-red-50 text-red-600"
      : "border-green-200 bg-green-50 text-green-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${style}`}
    >
      {value}
    </span>
  );
}

function Empty({ text }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center p-12 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4ff] text-[#3b71e6]">
          <Users size={22} />
        </div>

        <p className="text-sm text-gray-500">{text}</p>
      </div>
    </div>
  );
}