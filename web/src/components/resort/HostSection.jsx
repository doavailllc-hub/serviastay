import { ShieldCheck } from "lucide-react";

export default function HostSection({ property, onMessageHost }) {
  return (
    <section className="border-b border-gray-200 py-8">
      <h2 className="mb-6 text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
        Hosted by {property?.host_name || "Dovail Stay"}
      </h2>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff] text-xl font-semibold text-[#3b71e6]">
              {(property?.host_name || "D").charAt(0).toUpperCase()}
            </div>

            <div>
              <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold">
                {property?.host_name || "Dovail Host"}

                {property?.host_kyc_status === "Approved" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    <ShieldCheck size={13} />
                    Verified
                  </span>
                )}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {property?.host_email || "Host email unavailable"}
              </p>

              {property?.host_phone && (
                <p className="mt-1 text-sm text-gray-500">
                  {property.host_phone}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onMessageHost}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50"
          >
            Message host
          </button>
        </div>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <HostStat label="Response rate" value={property?.response_rate || "100%"} />
          <HostStat label="Response time" value={property?.response_time || "1 hour"} />
          <HostStat label="Support" value="24/7" />
        </div>
      </div>
    </section>
  );
}

function HostStat({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-950">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}