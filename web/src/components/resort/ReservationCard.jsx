import { MessageCircle, Star } from "lucide-react";

import AirbnbDatePicker from "./AirbnbDatePicker";
import GuestDropdown from "./GuestDropdown";
import PriceSummary from "./PriceSummary";
import { formatINR } from "../../utils/resortUtils";

export default function ReservationCard({
  price,
  rating,
  today,
  checkin,
  checkout,
  setCheckin,
  setCheckout,
  adults,
  setAdults,
  children,
  setChildren,
  infants,
  setInfants,
  pets,
  setPets,
  maxGuests,
  totalGuests,
  nights,
  subtotal,
  taxes,
  total,
  dateError,
  guestDropdownRef,
  guestDropdownOpen,
  setGuestDropdownOpen,
  onReserve,
  bookedRanges,
  onMessageHost,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <span className="text-2xl font-semibold text-gray-950">
            {formatINR(price)}
          </span>
          <span className="text-sm text-gray-500"> / night</span>
        </div>

        <span className="inline-flex items-center gap-1 text-sm font-medium">
          <Star size={13} fill="currentColor" />
          {rating || "New"}
        </span>
      </div>

      <div className="overflow-visible rounded-xl border border-gray-200 bg-white">
        <AirbnbDatePicker
          checkin={checkin}
          checkout={checkout}
          setCheckin={setCheckin}
          setCheckout={setCheckout}
          today={today}
          bookedRanges={bookedRanges}
        />

        <GuestDropdown
          refEl={guestDropdownRef}
          open={guestDropdownOpen}
          setOpen={setGuestDropdownOpen}
          adults={adults}
          setAdults={setAdults}
          children={children}
          setChildren={setChildren}
          infants={infants}
          setInfants={setInfants}
          pets={pets}
          setPets={setPets}
          totalGuests={totalGuests}
          maxGuests={maxGuests}
        />
      </div>

      {dateError && (
        <p className="mt-3 text-sm font-medium text-red-600">
          Checkout date must be after check-in.
        </p>
      )}

      <button
        type="button"
        onClick={onReserve}
        disabled={dateError}
        className="mt-5 h-12 w-full rounded-xl bg-[#3b71e6] text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        Reserve
      </button>

      <button
        type="button"
        onClick={onMessageHost}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium transition hover:bg-gray-50"
      >
        <MessageCircle size={17} />
        Message host
      </button>

      <p className="mt-3 text-center text-sm text-gray-500">
        You won’t be charged yet
      </p>

      <PriceSummary
        price={price}
        nights={nights}
        subtotal={subtotal}
        taxes={taxes}
        total={total}
      />
    </div>
  );
}