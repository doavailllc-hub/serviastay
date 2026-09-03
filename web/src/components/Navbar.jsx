import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  Gift,
  Globe,
  Heart,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";

import logo from "../assets/logo.png";
import api from "../api/api";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const closeOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  function loadUserState() {
    try {
      const storedUser =
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(sessionStorage.getItem("user") || "null");
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

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
  }

  async function loadUnreadMessages(userId) {
    try {
      const res = await api.get(`/conversations/${userId}`);
      const total = (res.data || []).reduce(
        (sum, item) => sum + Number(item.unread_count || 0),
        0
      );
      setUnreadCount(total);
    } catch {
      setUnreadCount(0);
    }
  }

  async function loadNotificationCount(userId) {
    try {
      const res = await api.get(`/notifications/${userId}/unread-count`);
      setNotificationCount(res.data?.count || 0);
    } catch {
      setNotificationCount(0);
    }
  }

  useEffect(() => {
    loadUserState();
  }, [location.pathname]);

  const closeMenu = () => setOpen(false);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    setUser(null);
    setOpen(false);
    navigate("/", { replace: true });
  };

  const avatarLetter =
    user?.fullname?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  const totalBadge = unreadCount + notificationCount;
  const mobileTabPaths = ["/", "/home", "/wishlist", "/trips", "/messages", "/profile"];
  const showMobileTabs = mobileTabPaths.includes(location.pathname);

  useEffect(() => {
    document.body.classList.toggle("has-mobile-tab-bar", showMobileTabs);
    return () => document.body.classList.remove("has-mobile-tab-bar");
  }, [showMobileTabs]);

  return (
    <>
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[82px] max-w-[1500px] items-center justify-between px-5 md:px-10">
        <Link to="/home" onClick={closeMenu} className="flex items-center">
          <img
            src={logo}
            alt="Dovail Stay"
            className="h-9 w-auto object-contain"
          />
        </Link>

        <div className="hidden h-full items-center gap-10 md:flex">
          <NavTab
            to="/home"
            icon={<Home size={23} />}
            label="Homes"
            active={location.pathname === "/home" || location.pathname === "/"}
          />
          <NavTab
            to="/experiences"
            icon={<Sparkles size={23} />}
            label="Trips"
            active={location.pathname === "/experiences"}
            badge="NEW"
          />
         
        </div>

        <div ref={menuRef} className="relative flex items-center gap-3">
          <Link
            to="/host-type"
            onClick={closeMenu}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[#222] no-underline transition hover:bg-gray-100 lg:hidden"
          >
            <Home size={17} />
            Host
          </Link>

          <Link
            to="/host-type"
            onClick={closeMenu}
            className="hidden rounded-full px-4 py-3 text-sm font-semibold text-[#222] no-underline transition hover:bg-gray-100 lg:block"
          >
            {user ? "Switch to hosting" : "Become a host"}
          </Link>

          <Link
            to="/language"
            onClick={closeMenu}
            aria-label="Languages and currency"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-[#222] transition hover:bg-gray-100 md:flex"
            title="Languages & currency"
          >
            <Globe size={18} />
          </Link>

          {user && (
            <>
              <NotificationBell />

              <Link
                to="/messages"
                onClick={closeMenu}
                aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"}
                className="relative hidden h-10 w-10 items-center justify-center rounded-full text-[#222] transition hover:bg-gray-100 md:flex"
              >
                <MessageSquare size={19} />
                {unreadCount > 0 && <Badge count={unreadCount} />}
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            aria-label={open ? "Close account menu" : "Open account menu"}
            aria-expanded={open}
            className="relative flex h-[46px] w-[76px] items-center justify-between rounded-full border border-gray-300 bg-white px-3 text-[#222] transition hover:shadow-md"
          >
            {open ? <X size={18} /> : <Menu size={18} />}

            {user?.profile_image ? (
              <img
                src={user.profile_image}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#222] text-sm font-bold text-white">
                {avatarLetter}
              </div>
            )}

            {user && totalBadge > 0 && <Badge count={totalBadge} />}
          </button>

          {open && (
            <div className="absolute right-0 top-[58px] z-[9999] w-[330px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-gray-100 bg-white py-3 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
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
      </div>
    </nav>
    {showMobileTabs && (
      <MobileTabBar pathname={location.pathname} unreadCount={unreadCount} />
    )}
    </>
  );
}

function MobileTabBar({ pathname, unreadCount }) {
  const tabs = [
    { to: "/home", label: "Explore", icon: Search },
    { to: "/wishlist", label: "Wishlist", icon: Heart },
    { to: "/trips", label: "Trips", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessageSquare, badge: unreadCount },
    { to: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-[999] border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, badge }) => {
          const active = (to === "/home" && ["/", "/home"].includes(pathname)) || pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 no-underline transition-colors ${
                active ? "text-[#2f5fc2]" : "text-gray-700"
              }`}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {badge > 0 && (
                  <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2f5fc2] px-1 text-[9px] font-bold leading-none text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className="truncate text-[10px] font-semibold leading-[15px]">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function GuestMenu({ closeMenu }) {
  return (
    <>
      <MenuLink to="/login" text="Log in or sign up" strong onClick={closeMenu} />
      <Divider />
      <MenuLink
        to="/host-type"
        icon={<Home size={18} />}
        text="Become a host"
        subText="Earn extra income with Dovail Stay."
        onClick={closeMenu}
      />
      <MenuLink
        to="/language"
        icon={<Globe size={18} />}
        text="Languages & currency"
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
        to="/help"
        icon={<HelpCircle size={18} />}
        text="Help Center"
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
      <div className="px-6 py-4">
        <p className="text-base font-bold text-gray-950">
          {user.fullname || "User"}
        </p>
        <p className="mt-0.5 truncate text-sm text-gray-500">{user.email}</p>
      </div>

      <Divider />

      <MenuLink
        to="/host-type"
        icon={<Sparkles size={18} />}
        text="Switch to hosting"
        subText="List a stay or create a trip package."
        strong
        onClick={closeMenu}
      />

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
        badge={unreadCount}
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
        badge={notificationCount}
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

      <MenuLink to="/host-listings" text="Your listings" onClick={closeMenu} />
      <MenuLink to="/host-reservations" text="Reservations" onClick={closeMenu} />
      <MenuLink to="/host-calendar" text="Calendar" onClick={closeMenu} />
      <MenuLink to="/earnings" text="Earnings" onClick={closeMenu} />
      <MenuLink to="/host-reviews" text="Reviews" onClick={closeMenu} />

      <Divider />

      <button
        onClick={logout}
        className="flex h-[46px] w-full items-center gap-3 px-6 text-left text-[15px] text-[#222] transition hover:bg-[#f7f7f7]"
      >
        <LogOut size={18} />
        Log out
      </button>
    </>
  );
}

function NavTab({ to, icon, label, active, badge }) {
  return (
    <Link to={to} className="h-full no-underline">
      <button
        className={`relative flex h-full flex-col items-center justify-center px-1 transition ${
          active ? "text-[#2f5fc2]" : "text-gray-500 hover:text-[#2f5fc2]"
        }`}
      >
        {icon}
        <span className="mt-1 whitespace-nowrap text-sm font-semibold">
          {label}
        </span>

        {badge && (
          <span className="absolute -right-7 top-3 rounded-full bg-[#3b71e6]/10 px-2 py-0.5 text-[9px] font-black text-[#2f5fc2]">
            {badge}
          </span>
        )}

        {active && (
          <div className="absolute bottom-0 h-[3px] w-9 rounded-full bg-[#3b71e6]" />
        )}
      </button>
    </Link>
  );
}

function MenuLink({ to, icon, text, subText, badge, strong, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex min-h-[46px] items-center justify-between px-6 py-2.5 text-[15px] text-[#222] no-underline transition hover:bg-[#f7f7f7]"
    >
      <span className="flex items-center gap-3">
        {icon}
        <span>
          <span className={`block ${strong ? "font-bold" : "font-medium"}`}>
            {text}
          </span>
          {subText && (
            <span className="mt-0.5 block text-[13px] leading-snug text-[#717171]">
              {subText}
            </span>
          )}
        </span>
      </span>

      {badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3b71e6] px-1 text-xs font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function Badge({ count }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3b71e6] px-1 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function Divider() {
  return <hr className="mx-6 my-2 border-0 border-t border-[#eee]" />;
}
