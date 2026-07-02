import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import ResortDetails from "./pages/ResortDetails";
import BecomeHost from "./pages/BecomeHost";
import CategorySelect from "./pages/CategorySelect";
import Profile from "./pages/Profile";
import Wishlist from "./pages/Wishlist";
import Trips from "./pages/Trips";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import AccountSettings from "./pages/AccountSettings";
import Checkout from "./pages/Checkout";
import BookingSuccess from "./pages/BookingSuccess";
import HostDashboard from "./pages/HostDashboard";
import SearchResults from "./pages/SearchResults";
import HostListings from "./pages/HostListings";
import EditListing from "./pages/EditListing";
import HostCalendar from "./pages/HostCalendar";
import Earnings from "./pages/Earnings";
import Reviews from "./pages/Reviews";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NotFound from "./pages/NotFound";
import HelpCenter from "./pages/HelpCenter";
import LanguageCurrency from "./pages/LanguageCurrency";
import Experience from "./pages/Experiences";
import Services from "./pages/Services";
import PaymentMethods from "./pages/PaymentMethods";
import AddProperty from "./pages/AddProperty";
import HostReservations from "./pages/HostReservations";
import HostReviews from "./pages/HostReviews";
import Analytics from "./pages/Analytics";
import PaymentHistory from "./pages/PaymentHistory";
import Payouts from "./pages/Payouts";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import TripDetails from "./pages/TripDetails";
import WriteReview from "./pages/WriteReview";
import Receipt from "./pages/Receipt";
import Security from "./pages/Security";
import ForgotPassword from "./pages/ForgotPassword";
import Support from "./pages/Support";
import RecentlyViewed from "./pages/RecentlyViewed";
import HostProfile from "./pages/HostProfile";
import Verification from "./pages/Verification";
import ServiceDetails from "./pages/ServiceDetails";
import ServiceBookingDetails from "./pages/ServiceBookingDetails";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminProtectedRoute from "./routes/AdminProtectedRoute";
import AdminSignup from "./pages/admin/AdminSignup";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProperties from "./pages/admin/AdminProperties";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminKyc from "./pages/admin/AdminKyc";
import AdminCoupons from "./pages/admin/AdminCoupons";
import ExperienceDetails from "./pages/ExperienceDetails";
import ExperienceCheckout from "./pages/ExperienceCheckout";
import ExperienceBookingSuccess from "./pages/ExperienceBookingSuccess";
import MyExperienceBookings from "./pages/MyExperienceBookings";
import AddTripPackage from "./pages/AddTripPackage";
import HostTripPackages from "./pages/HostTripPackages";
import HostPackageDepartures from "./pages/HostPackageDepartures";
import EditTripPackage from "./pages/EditTripPackage";
import HostWallet from "./pages/HostWallet";
import AdminPayouts from "./pages/admin/AdminPayouts";
import HostType from "./pages/HostType";
import HostVerification from "./pages/HostVerification";
import AdminUserDetails from "./pages/admin/AdminUserDetails";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminAdmins from "./pages/admin/AdminAdmins";
import { Toaster } from "react-hot-toast";

function ProtectedPage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "14px",
            padding: "12px 16px",
            fontWeight: "600",
          },
        }}
      />

      <Routes>
      {/* ========= PUBLIC ROUTES ========= */}

      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
<Route
  path="/experience-booking-success"
  element={<ExperienceBookingSuccess />}
/>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/experience-checkout/:id" element={<ExperienceCheckout />} />
      <Route path="/search-results" element={<SearchResults />} />
      <Route path="/reserve/:id" element={<ResortDetails />} />
      <Route path="/service/:id" element={<ServiceDetails />} />
      <Route path="/experience-checkout/:id" element={<ExperienceCheckout />} />
<Route path="/write-review/:bookingId" element={<WriteReview />} />
<Route path="/host-type" element={<HostType />} />
      <Route path="/add-trip-package" element={<AddTripPackage />} />
      <Route
        path="/service-booking/:id"
        element={<ServiceBookingDetails />}
      />
<Route path="/experience-bookings" element={<MyExperienceBookings />} />
      <Route path="/experiences" element={<Experience />} />
      <Route path="/services" element={<Services />} />
      <Route path="/help" element={<HelpCenter />} />
<Route path="/host-trip-packages" element={<HostTripPackages />} />
<Route path="/edit-trip-package/:id" element={<EditTripPackage />} />

      {/* ========= PROTECTED ROUTES ========= */}

      <Route
        path="/category"
        element={
          <ProtectedPage>
            <CategorySelect />
          </ProtectedPage>
        }
      />
<Route
  path="/host-trip-packages/:id/departures"
  element={<HostPackageDepartures />}
/>
      <Route
        path="/wishlist"
        element={
          <ProtectedPage>
            <Wishlist />
          </ProtectedPage>
        }
      />
<Route
  path="/host-verification"
  element={
    <ProtectedPage>
      <HostVerification />
    </ProtectedPage>
  }
/>
      <Route
        path="/checkout"
        element={
          <ProtectedPage>
            <Checkout />
          </ProtectedPage>
        }
      />

      <Route
        path="/booking-success"
        element={
          <ProtectedPage>
            <BookingSuccess />
          </ProtectedPage>
        }
      />

      <Route
        path="/trips"
        element={
          <ProtectedPage>
            <Trips />
          </ProtectedPage>
        }
      />
<Route
  path="/trip/:id"
  element={
    <ProtectedPage>
      <TripDetails />
    </ProtectedPage>
  }
/>
      <Route
        path="/messages"
        element={
          <ProtectedPage>
            <Messages />
          </ProtectedPage>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedPage>
            <Notifications />
          </ProtectedPage>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedPage>
            <Profile />
          </ProtectedPage>
        }
      />

      <Route
        path="/account-settings"
        element={
          <ProtectedPage>
            <AccountSettings />
          </ProtectedPage>
        }
      />

      <Route
        path="/become-a-host"
        element={
          <ProtectedPage>
            <BecomeHost />
          </ProtectedPage>
        }
      />
<Route
  path="/receipt/:id"
  element={
    <ProtectedPage>
      <Receipt />
    </ProtectedPage>
  }
/>
      <Route
        path="/add-property"
        element={
          <ProtectedPage>
            <AddProperty />
          </ProtectedPage>
        }
      />
<Route
  path="/host-wallet"
  element={
    <ProtectedPage>
      <HostWallet />
    </ProtectedPage>
  }
/>
      <Route
        path="/host-dashboard"
        element={
          <ProtectedPage>
            <HostDashboard />
          </ProtectedPage>
        }
      />

      <Route
        path="/host-listings"
        element={
          <ProtectedPage>
            <HostListings />
          </ProtectedPage>
        }
      />

      <Route
        path="/host-reservations"
        element={
          <ProtectedPage>
            <HostReservations />
          </ProtectedPage>
        }
      />

      <Route
        path="/host-calendar"
        element={
          <ProtectedPage>
            <HostCalendar />
          </ProtectedPage>
        }
      />

      <Route
        path="/earnings"
        element={
          <ProtectedPage>
            <Earnings />
          </ProtectedPage>
        }
      />

      <Route
        path="/payments"
        element={
          <ProtectedPage>
            <PaymentHistory />
          </ProtectedPage>
        }
      />

      <Route
        path="/payouts"
        element={
          <ProtectedPage>
            <Payouts />
          </ProtectedPage>
        }
      />

      <Route
        path="/reviews"
        element={
          <ProtectedPage>
            <Reviews />
          </ProtectedPage>
        }
      />

      <Route
        path="/verification"
        element={
          <ProtectedPage>
            <Verification />
          </ProtectedPage>
        }
      />

      <Route
        path="/language"
        element={
          <ProtectedPage>
            <LanguageCurrency />
          </ProtectedPage>
        }
      />

      <Route path="/experiences/:id" element={<ExperienceDetails />} />
<Route path="/admin/login" element={<AdminLogin />} />
<Route path="/admin/signup" element={<AdminSignup />} />

<Route
  path="/admin"
  element={
    <AdminProtectedRoute>
      <AdminLayout />
    </AdminProtectedRoute>
  }
>
  <Route index element={<AdminDashboard />} />
  <Route path="dashboard" element={<AdminDashboard />} />
  <Route path="users" element={<AdminUsers />} />
  <Route path="users/:id" element={<AdminUserDetails />} />
  <Route path="properties" element={<AdminProperties />} />
  <Route path="bookings" element={<AdminBookings />} />
  <Route path="finance" element={<AdminFinance />} />
  <Route path="payments" element={<PaymentHistory />} />
  <Route path="payouts" element={<AdminPayouts />} />
  <Route path="kyc" element={<AdminKyc />} />
  <Route path="reviews" element={<AdminReviews />} />
  <Route path="coupons" element={<AdminCoupons />} />
  <Route path="analytics" element={<AdminAnalytics />} />
  <Route path="support" element={<AdminSupport />} />
  <Route path="settings" element={<AdminSettings />} />
  <Route path="audit-logs" element={<AdminAuditLogs />} />
  <Route path="admins" element={<AdminAdmins />} />
</Route>
      <Route path="*" element={<NotFound />} />

      </Routes>
    </>
  );
}