import { useEffect, useState } from "react";
import { Loader2, Save, Settings } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/api";

export default function AdminSettings() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/settings");
      setForm({
        platform_name: data.platform_name || "Servia Stay",
        support_email: data.support_email || "",
        support_phone: data.support_phone || "",
        commission_percent: data.commission_percent || 10,
        service_fee_percent: data.service_fee_percent || 5,
        tax_percent: data.tax_percent || 12,
        minimum_payout: data.minimum_payout || 1000,
        maintenance_mode: Boolean(data.maintenance_mode),
        allow_new_hosts: Boolean(data.allow_new_hosts),
        allow_new_bookings: Boolean(data.allow_new_bookings),
        cancellation_hours: data.cancellation_hours || 24,
        refund_days: data.refund_days || 7,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Settings load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await api.put("/admin/settings", form);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#3b71e6]" size={36} />
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#3b71e6]">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-semibold">Platform Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage finance, booking, support and platform controls.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Platform">
          <Input label="Platform Name" value={form.platform_name} onChange={(v) => update("platform_name", v)} />
          <Input label="Support Email" value={form.support_email} onChange={(v) => update("support_email", v)} />
          <Input label="Support Phone" value={form.support_phone} onChange={(v) => update("support_phone", v)} />
        </Card>

        <Card title="Finance">
          <Input type="number" label="Commission %" value={form.commission_percent} onChange={(v) => update("commission_percent", v)} />
          <Input type="number" label="Service Fee %" value={form.service_fee_percent} onChange={(v) => update("service_fee_percent", v)} />
          <Input type="number" label="Tax %" value={form.tax_percent} onChange={(v) => update("tax_percent", v)} />
          <Input type="number" label="Minimum Payout" value={form.minimum_payout} onChange={(v) => update("minimum_payout", v)} />
        </Card>

        <Card title="Booking Rules">
          <Input type="number" label="Cancellation Hours" value={form.cancellation_hours} onChange={(v) => update("cancellation_hours", v)} />
          <Input type="number" label="Refund Days" value={form.refund_days} onChange={(v) => update("refund_days", v)} />
          <Toggle label="Allow New Bookings" checked={form.allow_new_bookings} onChange={(v) => update("allow_new_bookings", v)} />
        </Card>

        <Card title="Platform Controls">
          <Toggle label="Maintenance Mode" checked={form.maintenance_mode} onChange={(v) => update("maintenance_mode", v)} />
          <Toggle label="Allow New Hosts" checked={form.allow_new_hosts} onChange={(v) => update("allow_new_hosts", v)} />
        </Card>
      </section>

      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex h-12 items-center gap-2 rounded-xl bg-[#3b71e6] px-6 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
          Save Settings
        </button>
      </div>
    </main>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-[26px] border border-gray-200 bg-white p-5">
      <h2 className="mb-5 text-xl font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#3b71e6]"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5"
      />
    </label>
  );
}