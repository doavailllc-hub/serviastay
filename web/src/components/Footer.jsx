import { Link } from "react-router-dom";
import { Globe, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <h2 className="text-2xl font-black text-[#8363F5]">
              Dovail Stay
            </h2>

            <p className="mt-4 text-sm leading-6 text-gray-500">
              Book unique stays, manage trips, host properties, and travel
              confidently with secure reservations.
            </p>

            <div className="mt-5 flex gap-3">
              <SocialIcon label="F" />
              <SocialIcon label="I" />
              <SocialIcon label="X" />
            </div>
          </div>

          <FooterColumn
            title="Explore"
            links={[
              ["Home", "/home"],
              ["Experiences", "/experiences"],
              ["Services", "/services"],
              ["Recently viewed", "/recently-viewed"],
              ["Wishlist", "/wishlist"],
            ]}
          />

          <FooterColumn
            title="Account"
            links={[
              ["Trips", "/trips"],
              ["Messages", "/messages"],
              ["Payments", "/payments"],
              ["Refunds", "/refunds"],
              ["Verification", "/verification"],
            ]}
          />

          <div>
            <h3 className="font-bold text-gray-900">Contact</h3>

            <div className="mt-4 space-y-3 text-sm text-gray-500">
              <p className="flex items-center gap-2">
                <Mail size={16} />
                support@dovail.com
              </p>

              <p className="flex items-center gap-2">
                <Phone size={16} />
                +91 00000 00000
              </p>

              <p className="flex items-center gap-2">
                <MapPin size={16} />
                India
              </p>

              <p className="flex items-center gap-2">
                <Globe size={16} />
                www.dovail.com
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-4 border-t pt-6 text-sm text-gray-500 md:flex-row">
          <p>© {new Date().getFullYear()} Dovail Stay. All rights reserved.</p>

          <div className="flex flex-wrap gap-5">
            <Link to="/help" className="hover:text-[#8363F5]">
              Help
            </Link>

            <Link to="/support" className="hover:text-[#8363F5]">
              Support
            </Link>

            <Link to="/account-settings" className="hover:text-[#8363F5]">
              Settings
            </Link>

            <Link to="/privacy" className="hover:text-[#8363F5]">
              Privacy
            </Link>

            <Link to="/terms" className="hover:text-[#8363F5]">
              Terms
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
      <h3 className="font-bold text-gray-900">{title}</h3>

      <div className="mt-4 space-y-3">
        {links.map(([label, to]) => (
          <Link
            key={to}
            to={to}
            className="block text-sm text-gray-500 hover:text-[#8363F5]"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function SocialIcon({ label }) {
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F1FF] text-sm font-black text-[#8363F5] transition hover:bg-[#8363F5] hover:text-white"
    >
      {label}
    </button>
  );
}