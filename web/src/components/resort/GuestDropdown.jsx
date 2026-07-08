import { ChevronDown, Minus, Plus } from "lucide-react";

export default function GuestDropdown({
  refEl,
  open,
  setOpen,
  adults,
  setAdults,
  children,
  setChildren,
  infants,
  setInfants,
  pets,
  setPets,
  totalGuests,
  maxGuests,
}) {
  const updateAdults = (value) => {
    const nextAdults = Math.max(1, Math.min(value, maxGuests - children));
    setAdults(nextAdults);
  };

  const updateChildren = (value) => {
    const nextChildren = Math.max(0, Math.min(value, maxGuests - adults));
    setChildren(nextChildren);
  };

  const summary = [
    `${totalGuests} ${totalGuests === 1 ? "guest" : "guests"}`,
    infants > 0 ? `${infants} infant${infants > 1 ? "s" : ""}` : "",
    pets > 0 ? `${pets} pet${pets > 1 ? "s" : ""}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const maxReached = totalGuests >= maxGuests;

  return (
    <div ref={refEl} className="relative border-t border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-gray-50"
      >
        <div>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Guests
          </span>

          <span className="mt-1 block text-sm font-medium text-gray-950">
            {summary}
          </span>

          <p className="mt-1 text-xs text-gray-500">
            Maximum {maxGuests} guests
          </p>
        </div>

        <ChevronDown
          size={19}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[84px] z-50 rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
          <GuestRow
            title="Adults"
            subtitle="Ages 13 or above"
            value={adults}
            min={1}
            max={maxGuests - children}
            onChange={updateAdults}
          />

          <GuestRow
            title="Children"
            subtitle="Ages 2–12"
            value={children}
            min={0}
            max={maxGuests - adults}
            onChange={updateChildren}
          />

          <GuestRow
            title="Infants"
            subtitle="Under 2"
            value={infants}
            min={0}
            max={5}
            onChange={setInfants}
          />

          <GuestRow
            title="Pets"
            subtitle="Bringing a service animal?"
            value={pets}
            min={0}
            max={3}
            onChange={setPets}
            last
          />

          {maxReached && (
            <p className="mt-3 rounded-xl bg-[#eef4ff] px-4 py-3 text-sm text-[#3b71e6]">
              Maximum guest limit reached for this stay.
            </p>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-5 w-full rounded-xl bg-[#3b71e6] py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function GuestRow({ title, subtitle, value, min, max, onChange, last }) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className={`flex items-center justify-between py-4 ${
        last ? "" : "border-b border-gray-100"
      }`}
    >
      <div>
        <p className="text-sm font-medium text-gray-950">{title}</p>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <CounterButton onClick={decrease} disabled={value <= min}>
          <Minus size={14} />
        </CounterButton>

        <span className="w-5 text-center text-sm font-medium">{value}</span>

        <CounterButton onClick={increase} disabled={value >= max}>
          <Plus size={14} />
        </CounterButton>
      </div>
    </div>
  );
}

function CounterButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-950 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}