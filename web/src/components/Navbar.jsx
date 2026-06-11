import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import { Sparkles } from "lucide-react";
import {
  Menu,
  User,
  Globe,
  Home,
  Bell,
  Heart,
  MessageSquare,
  CalendarDays,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 mx-auto flex h-20 max-w-[1500px] items-center justify-between border-b border-gray-200 bg-white px-6 md:px-12">
     <Link to="/home" className="flex items-center no-underline">
  <img
    src={logo}
    alt="Staybnb"
    className="h-8 w-auto object-contain"
  />
</Link>

   <div className="hidden h-full items-center justify-center gap-10 md:flex">

  {/* Homes */}
  <Link to="/home">
    <button
      className={`relative flex h-full flex-col items-center justify-center px-0 py-2 transition ${
        location.pathname === "/home"
          ? "text-[#8363F5]"
          : "text-gray-500 hover:text-[#8363F5]"
      }`}
    >
      <Home size={24} />

      <span className="mt-1 whitespace-nowrap text-sm font-semibold">
        Homes
      </span>

      {location.pathname === "/home" && (
        <div className="absolute bottom-1 h-[3px] w-8 rounded-full bg-[#8363F5]" />
      )}
    </button>
  </Link>

  {/* Experiences */}
  <Link to="/experiences">
    <button
      className={`relative flex h-full flex-col items-center justify-center px-0 py-2 transition ${
        location.pathname === "/experiences"
          ? "text-[#8363F5]"
          : "text-gray-500 hover:text-[#8363F5]"
      }`}
    >
      <Sparkles size={24} />

      <span className="mt-1 whitespace-nowrap text-sm font-semibold">
        Experiences
      </span>

      <span className="absolute right-[-18px] top-1.5 rounded-md bg-slate-500 px-1.5 py-0.5 text-[9px] text-white">
        NEW
      </span>

      {location.pathname === "/experiences" && (
        <div className="absolute bottom-1 h-[3px] w-8 rounded-full bg-[#8363F5]" />
      )}
    </button>
  </Link>

  {/* Services */}
  <Link to="/services">
    <button
      className={`relative flex h-full flex-col items-center justify-center px-0 py-2 transition ${
        location.pathname === "/services"
          ? "text-[#8363F5]"
          : "text-gray-500 hover:text-[#8363F5]"
      }`}
    >
      <Bell size={24} />

      <span className="mt-1 whitespace-nowrap text-sm font-semibold">
        Services
      </span>

      <span className="absolute right-[-18px] top-1.5 rounded-md bg-slate-500 px-1.5 py-0.5 text-[9px] text-white">
        NEW
      </span>

      {location.pathname === "/services" && (
        <div className="absolute bottom-1 h-[3px] w-8 rounded-full bg-[#8363F5]" />
      )}
    </button>
  </Link>

</div>
      <div className="relative flex items-center justify-end gap-[18px]">
        <Link
          to="/become-a-host"
          className="hidden whitespace-nowrap rounded-full px-4 py-3 text-sm font-semibold text-[#222] no-underline hover:bg-gray-100 md:block"
        >
          Switch to hosting
        </Link>

        <button className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 md:flex">
          <Globe size={18} />
        </button>

        <button
          onClick={() => setOpen(!open)}
          className="relative flex h-[44px] w-[72px] cursor-pointer items-center justify-between rounded-full border border-[#ddd] bg-white px-3 text-[#222] hover:shadow-md"
        >
          <Menu size={18} />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#717171] font-bold text-white">
            J
          </div>
          <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-[#8363f5]" />
        </button>

        {open && (
          <div className="absolute right-0 top-[58px] z-[9999] w-[315px] overflow-hidden rounded-2xl border border-gray-100 bg-white py-3 shadow-2xl">
            <MenuLink to="/wishlist" icon={<Heart size={18} />} text="Wishlists" />
            <MenuLink to="/trips" icon={<CalendarDays size={18} />} text="Trips" />
            <MenuLink to="/messages" icon={<MessageSquare size={18} />} text="Messages" badge="1" />
            <MenuLink to="/profile" icon={<User size={18} />} text="Profile" />

            <Divider />

            <MenuLink to="/notifications" icon={<Bell size={18} />} text="Notifications" />
            <MenuLink to="/account-settings" icon={<Settings size={18} />} text="Account settings" />
            <MenuLink to="/language" icon={<Globe size={18} />} text="Languages & currency" />
            <MenuLink to="/help" icon={<HelpCircle size={18} />} text="Help Center" />

            <Divider />

            <Link
              to="/host-dashboard"
              className="flex flex-col items-start gap-1 px-6 py-3 text-[#222] no-underline hover:bg-[#f7f7f7]"
            >
              <strong>Host dashboard</strong>
              <span className="text-[13px] leading-snug text-[#717171]">
                Manage listings, bookings and earnings.
              </span>
            </Link>

            <Divider />

            <MenuLink to="/host-listings" text="Your listings" />
            <MenuLink to="/host-calendar" text="Calendar" />
            <MenuLink to="/earnings" text="Earnings" />
            <MenuLink to="/reviews" text="Reviews" />
            <MenuLink to="/admin" text="Admin dashboard" />

            <Divider />

            <MenuLink to="/" icon={<LogOut size={18} />} text="Log out" />
          </div>
        )}
      </div>
    </nav>
  );
}

function MenuLink({ to, icon, text, badge }) {
  return (
    <Link
      to={to}
      className="flex h-[44px] items-center justify-between px-6 text-[15px] text-[#222] no-underline hover:bg-[#f7f7f7]"
    >
      <span className="flex items-center gap-3">
        {icon}
        {text}
      </span>

      {badge && (
        <b className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8363f5] text-xs text-white">
          {badge}
        </b>
      )}
    </Link>
  );
}

function Divider() {
  return <hr className="mx-6 my-2 border-0 border-t border-[#eee]" />;
}