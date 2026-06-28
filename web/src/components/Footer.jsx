import { Link } from "react-router-dom";

const BRAND = "#3b71e6";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-950">
              Dovail Stay
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-6 text-gray-500">
              Book stays, manage trips and host properties with a simple secure
              travel experience.
            </p>
          </div>

          <FooterColumn
            title="Explore"
            links={[
              ["Home", "/home"],
              ["Experiences", "/experiences"],
              ["Wishlist", "/wishlist"],
              ["Recently viewed", "/recently-viewed"],
            ]}
          />

          <FooterColumn
            title="Account"
            links={[
              ["Trips", "/trips"],
              ["Messages", "/messages"],
              ["Payments", "/payments"],
              ["Verification", "/verification"],
            ]}
          />

          <FooterColumn
            title="Support"
            links={[
              ["Help", "/help"],
              ["Support", "/support"],
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
            ]}
          />
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 border-t border-gray-200 pt-5 text-sm text-gray-500 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Dovail Stay</p>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span>support@dovail.com</span>
            <span>India</span>
            <Link to="/account-settings" className="hover:text-[#3b71e6]">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-950">{title}</h3>

      <div className="mt-3 space-y-2.5">
        {links.map(([label, to]) => (
          <Link
            key={to}
            to={to}
            className="block text-sm text-gray-500 transition hover:text-[#3b71e6]"
            style={{ "--footer-brand": BRAND }}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}