import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import api from "../api/api";
import NotificationBell from "./NotificationBell";
import { useEffect, useRef, useState } from "react";
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
  Sparkles,
  Gift,
  Users,
} from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserState();
  }, [location.pathname]);

  const loadUserState = () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      if (storedUser?.id && token) {
        setUser(storedUser);
        loadUnreadMessages(storedUser.id);
        loadNotificationCount(storedUser.id);
      } else {
        setUser(null);
        setUnreadCount(0);
        setNotificationCount(0);
      }
    } catch {
      setUser(null);
      setUnreadCount(0);
      setNotificationCount(0);
    }
  };

  const loadUnreadMessages = async (userId) => {
    try {
      const res = await api.get(`/conversations/${userId}`);

      const totalUnread = (res.data || []).reduce(
        (sum, item) => sum + Number(item.unread_count || 0),
        0
      );

      setUnreadCount(totalUnread);
    } catch {
      setUnreadCount(0);
    }
  };

  const loadNotificationCount = async (userId) => {
    try {
      const res = await api.get(`/notifications/${userId}/unread-count`);
      setNotificationCount(res.data.count || 0);
    } catch {
      setNotificationCount(0);
    }
  };

  const closeMenu = () => setOpen(false);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    setUser(null);
    setUnreadCount(0);
    setNotificationCount(0);
    setOpen(false);

    navigate("/", { replace: true });
  };

  const avatarLetter =
    user?.fullname?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  const totalBadge = unreadCount + notificationCount;
const menuRef = useRef(null);

useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target)
    ) {
      setOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () =>
    document.removeEventListener(
      "mousedown",
      handleClickOutside
    );
}, []);
return (
  <nav className="sticky top-0 z-50 mx-auto flex h-20 max-w-[1500px] items-center justify-between border-b border-gray-200 bg-white/90 px-6 backdrop-blur-md md:px-12">
    <Link to="/home" onClick={closeMenu} className="flex items-center no-underline">
      <img src={logo} alt="Dovail Stay" className="h-8 w-auto object-contain" />
    </Link>

    <div className="hidden h-full items-center justify-center gap-10 md:flex">
      <NavTab to="/home" icon={<Home size={24} />} label="Homes" active={location.pathname === "/home" || location.pathname === "/"} />
      <NavTab to="/experiences" icon={<Sparkles size={24} />} label="Experiences" active={location.pathname === "/experiences"} badge="NEW" />
      <NavTab to="/services" icon={<Bell size={24} />} label="Services" active={location.pathname === "/services"} badge="NEW" />
    </div>

    <div className="relative flex items-center justify-end gap-[18px]">
      <Link
        to="/become-a-host"
        onClick={closeMenu}
        className="hidden whitespace-nowrap rounded-full px-4 py-3 text-sm font-semibold text-[#222] no-underline hover:bg-gray-100 md:block"
      >
        {user ? "Switch to hosting" : "Become a host"}
      </Link>

      <button type="button" className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 md:flex">
        <Globe size={18} />
      </button>

      {user && (
        <>
          <NotificationBell />

          <Link
            to="/messages"
            onClick={closeMenu}
            className="relative hidden h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 md:flex"
          >
            <MessageSquare size={19} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7e4ff5] px-1 text-[11px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        </>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-[44px] w-[72px] cursor-pointer items-center justify-between rounded-full border border-[#ddd] bg-white px-3 text-[#222] hover:shadow-md"
      >
        <Menu size={18} />

        {user?.profile_image ? (
          <img src={user.profile_image} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#717171] font-bold text-white">
            {avatarLetter}
          </div>
        )}

        {user && totalBadge > 0 && (
          <span className="absolute right-1 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7e4ff5] px-1 text-[10px] font-bold text-white">
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[58px] z-[9999] w-[315px] overflow-hidden rounded-2xl border border-gray-100 bg-white py-3 shadow-2xl">
          {!user ? (
            <GuestMenu closeMenu={closeMenu} />
          ) : (
            <UserMenu
              user={user}
              unreadCount={unreadCount}
              notificationCount={notificationCount}
              logout={logout}
              closeMenu={closeMenu}
            />
          )}
        </div>
      )}
    </div>
  </nav>
);
}

function GuestMenu({ closeMenu }) {
  return (
    <>
      <MenuLink
        to="/help"
        icon={<HelpCircle size={18} />}
        text="Help Center"
        onClick={closeMenu}
      />

      <Divider />

      <MenuLink
        to="/become-a-host"
        icon={<Home size={18} />}
        text="Become a host"
        subText="It's easy to start hosting and earn extra income."
        onClick={closeMenu}
      />

      <MenuLink
        to="/find-co-host"
        icon={<Users size={18} />}
        text="Find a co-host"
        onClick={closeMenu}
      />

      <MenuLink
        to="/gift-cards"
        icon={<Gift size={18} />}
        text="Gift cards"
        onClick={closeMenu}
      />

      <Divider />

      <MenuLink
        to="/login"
        text="Log in or sign up"
        onClick={closeMenu}
      />
    </>
  );
}

function UserMenu({
  user,
  unreadCount,
  notificationCount,
  logout,
  closeMenu,
}) {
  return (
    <>
      <div className="px-6 py-3">
        <p className="font-bold text-gray-900">{user.fullname || "User"}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      <Divider />
<MenuLink
  to="/host-dashboard"
  icon={<Home size={18} />}
  text="Host Dashboard"
  onClick={closeMenu}
/>
      <MenuLink
        to="/wishlist"
        icon={<Heart size={18} />}
        text="Wishlists"
        onClick={closeMenu}
      />

      <MenuLink
        to="/trips"
        icon={<CalendarDays size={18} />}
        text="Trips"
        onClick={closeMenu}
      />

      <MenuLink
        to="/messages"
        icon={<MessageSquare size={18} />}
        text="Messages"
        badge={unreadCount > 0 ? unreadCount : null}
        onClick={closeMenu}
      />

      <MenuLink
        to="/profile"
        icon={<User size={18} />}
        text="Profile"
        onClick={closeMenu}
      />

      <Divider />

      <MenuLink
        to="/notifications"
        icon={<Bell size={18} />}
        text="Notifications"
        badge={notificationCount > 0 ? notificationCount : null}
        onClick={closeMenu}
      />

      <MenuLink
        to="/account-settings"
        icon={<Settings size={18} />}
        text="Account settings"
        onClick={closeMenu}
      />

      <MenuLink
        to="/language"
        icon={<Globe size={18} />}
        text="Languages & currency"
        onClick={closeMenu}
      />

      <MenuLink
        to="/help"
        icon={<HelpCircle size={18} />}
        text="Help Center"
        onClick={closeMenu}
      />

      <Divider />

      <Link
        to="/host-dashboard"
        onClick={closeMenu}
        className="flex flex-col items-start gap-1 px-6 py-3 text-[#222] no-underline hover:bg-[#f7f7f7]"
      >
        <strong>Host dashboard</strong>
        <span className="text-[13px] leading-snug text-[#717171]">
          Manage listings, bookings and earnings.
        </span>
      </Link>

      <Divider />

      <MenuLink to="/host-listings" text="Your listings" onClick={closeMenu} />
      <MenuLink to="/host-reservations" text="Reservations" onClick={closeMenu} />
      <MenuLink to="/host-calendar" text="Calendar" onClick={closeMenu} />
      <MenuLink to="/earnings" text="Earnings" onClick={closeMenu} />
      <MenuLink to="/host-reviews" text="Reviews" onClick={closeMenu} />

      <Divider />

      <button
        onClick={logout}
        className="flex h-[44px] w-full items-center gap-3 px-6 text-left text-[15px] text-[#222] hover:bg-[#f7f7f7]"
      >
        <LogOut size={18} />
        Log out
      </button>
    </>
  );
}

function NavTab({ to, icon, label, active, badge }) {
  return (
    <Link to={to} className="no-underline">
      <button
        className={`relative flex h-full flex-col items-center justify-center px-0 py-2 transition ${
          active ? "text-[#8363F5]" : "text-gray-500 hover:text-[#8363F5]"
        }`}
      >
        {icon}

        <span className="mt-1 whitespace-nowrap text-sm font-semibold">
          {label}
        </span>

        {badge && (
          <span className="absolute right-[-18px] top-1.5 rounded-md bg-slate-500 px-1.5 py-0.5 text-[9px] text-white">
            {badge}
          </span>
        )}

        {active && (
          <div className="absolute bottom-1 h-[3px] w-8 rounded-full bg-[#8363F5]" />
        )}
      </button>
    </Link>
  );
}

function MenuLink({ to, icon, text, subText, badge, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex min-h-[44px] items-center justify-between px-6 py-2 text-[15px] text-[#222] no-underline hover:bg-[#f7f7f7]"
    >
      <span className="flex items-center gap-3">
        {icon}
        <span>
          <span className="block">{text}</span>
          {subText && (
            <span className="mt-0.5 block text-[13px] leading-snug text-[#717171]">
              {subText}
            </span>
          )}
        </span>
      </span>

      {badge && (
        <b className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8363F5] px-1 text-xs text-white">
          {badge}
        </b>
      )}
    </Link>
  );
}

function Divider() {
  return <hr className="mx-6 my-2 border-0 border-t border-[#eee]" />;
}