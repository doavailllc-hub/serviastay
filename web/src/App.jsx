import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminProtectedRoute from "./routes/AdminProtectedRoute";

import { Toaster } from "react-hot-toast";
import { RouteSeo } from "./components/Seo";

const pageModules = import.meta.glob([
  "./pages/**/*.jsx",
  "./layouts/**/*.jsx",
  "!./pages/Home.jsx",
  "!./pages/AdminCoupons.jsx",
  "!./pages/PriceSummary.jsx",
]);
const lazyPage = (path) => lazy(pageModules[`${path}.jsx`]);
const Login = lazyPage("./pages/Login");
const Signup = lazyPage("./pages/Signup");
const ResortDetails = lazyPage("./pages/ResortDetails");
const BecomeHost = lazyPage("./pages/BecomeHost");
const CategorySelect = lazyPage("./pages/CategorySelect");
const Profile = lazyPage("./pages/Profile");
const Wishlist = lazyPage("./pages/Wishlist");
const Trips = lazyPage("./pages/Trips");
const Messages = lazyPage("./pages/Messages");
const Notifications = lazyPage("./pages/Notifications");
const AccountSettings = lazyPage("./pages/AccountSettings");
const Checkout = lazyPage("./pages/Checkout");
const BookingSuccess = lazyPage("./pages/BookingSuccess");
const HostDashboard = lazyPage("./pages/HostDashboard");
const SearchResults = lazyPage("./pages/SearchResults");
const HostListings = lazyPage("./pages/HostListings");
const EditListing = lazyPage("./pages/EditListing");
const HostCalendar = lazyPage("./pages/HostCalendar");
const Earnings = lazyPage("./pages/Earnings");
const Reviews = lazyPage("./pages/Reviews");
const NotFound = lazyPage("./pages/NotFound");
const HelpCenter = lazyPage("./pages/HelpCenter");
const LanguageCurrency = lazyPage("./pages/LanguageCurrency");
const Experience = lazyPage("./pages/Experiences");
const Services = lazyPage("./pages/Services");
const PaymentMethods = lazyPage("./pages/PaymentMethods");
const AddProperty = lazyPage("./pages/AddProperty");
const HostReservations = lazyPage("./pages/HostReservations");
const HostReviews = lazyPage("./pages/HostReviews");
const Analytics = lazyPage("./pages/Analytics");
const PaymentHistory = lazyPage("./pages/PaymentHistory");
const Payouts = lazyPage("./pages/Payouts");
const TripDetails = lazyPage("./pages/TripDetails");
const WriteReview = lazyPage("./pages/WriteReview");
const Receipt = lazyPage("./pages/Receipt");
const Security = lazyPage("./pages/Security");
const ForgotPassword = lazyPage("./pages/ForgotPassword");
const Support = lazyPage("./pages/Support");
const RecentlyViewed = lazyPage("./pages/RecentlyViewed");
const HostProfile = lazyPage("./pages/HostProfile");
const Verification = lazyPage("./pages/Verification");
const ServiceDetails = lazyPage("./pages/ServiceDetails");
const ServiceBookingDetails = lazyPage("./pages/ServiceBookingDetails");
const MyServiceBookings = lazyPage("./pages/MyServiceBookings");
const ExperienceDetails = lazyPage("./pages/ExperienceDetails");
const ExperienceCheckout = lazyPage("./pages/ExperienceCheckout");
const ExperienceBookingSuccess = lazyPage("./pages/ExperienceBookingSuccess");
const MyExperienceBookings = lazyPage("./pages/MyExperienceBookings");
const AddTripPackage = lazyPage("./pages/AddTripPackage");
const HostTripPackages = lazyPage("./pages/HostTripPackages");
const HostPackageDepartures = lazyPage("./pages/HostPackageDepartures");
const EditTripPackage = lazyPage("./pages/EditTripPackage");
const HostWallet = lazyPage("./pages/HostWallet");
const HostType = lazyPage("./pages/HostType");
const HostVerification = lazyPage("./pages/HostVerification");
const RefundRequest = lazyPage("./pages/RefundRequest");
const PrivacyPolicy = lazyPage("./pages/PrivacyPolicy");
const Terms = lazyPage("./pages/Terms");
const AdminLayout = lazyPage("./layouts/AdminLayout");
const AdminLogin = lazyPage("./pages/admin/AdminLogin");
const AdminDashboard = lazyPage("./pages/admin/AdminDashboard");
const AdminAnalytics = lazyPage("./pages/admin/AdminAnalytics");
const AdminUsers = lazyPage("./pages/admin/AdminUsers");
const AdminProperties = lazyPage("./pages/admin/AdminProperties");
const AdminReviews = lazyPage("./pages/admin/AdminReviews");
const AdminBookings = lazyPage("./pages/admin/AdminBookings");
const AdminKyc = lazyPage("./pages/admin/AdminKyc");
const AdminCoupons = lazyPage("./pages/admin/AdminCoupons");
const AdminPayouts = lazyPage("./pages/admin/AdminPayouts");
const AdminUserDetails = lazyPage("./pages/admin/AdminUserDetails");
const AdminSupport = lazyPage("./pages/admin/AdminSupport");
const AdminFinance = lazyPage("./pages/admin/AdminFinance");
const AdminSettings = lazyPage("./pages/admin/AdminSettings");
const AdminAuditLogs = lazyPage("./pages/admin/AdminAuditLogs");
const AdminAdmins = lazyPage("./pages/admin/AdminAdmins");
const AdminRefunds = lazyPage("./pages/admin/AdminRefunds");
const AdminTrips = lazyPage("./pages/admin/AdminTrips");

function ProtectedPage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function RouteFallback() {
  return <div className="route-loading" role="status" aria-label="Loading page" />;
}
export default function App() {
  return (
    <>
      <RouteSeo />
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

      <Suspense fallback={<RouteFallback />}>
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
<Route path="/write-review/:bookingId" element={<ProtectedPage><WriteReview /></ProtectedPage>} />
<Route path="/host-type" element={<ProtectedPage><HostType /></ProtectedPage>} />
      <Route path="/add-trip-package" element={<ProtectedPage><AddTripPackage /></ProtectedPage>} />
<Route path="/privacy" element={<PrivacyPolicy />} />
<Route path="/terms" element={<Terms />} />
<Route path="/support" element={<Support />} />

      <Route
        path="/service-booking/:id"
        element={<ProtectedPage><ServiceBookingDetails /></ProtectedPage>}
      />
      <Route path="/service-bookings" element={<ProtectedPage><MyServiceBookings /></ProtectedPage>} />
<Route path="/experience-bookings" element={<ProtectedPage><MyExperienceBookings /></ProtectedPage>} />
      <Route path="/experiences" element={<Experience />} />
      <Route path="/services" element={<Services />} />
      <Route path="/help" element={<HelpCenter />} />
<Route path="/host-trip-packages" element={<ProtectedPage><HostTripPackages /></ProtectedPage>} />
<Route path="/edit-trip-package/:id" element={<ProtectedPage><EditTripPackage /></ProtectedPage>} />
<Route path="/refund-request/:bookingId" element={<ProtectedPage><RefundRequest /></ProtectedPage>} />
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
  element={<ProtectedPage><HostPackageDepartures /></ProtectedPage>}
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
      <Route path="/edit-listing/:id" element={<ProtectedPage><EditListing /></ProtectedPage>} />
      <Route path="/payment-methods" element={<ProtectedPage><PaymentMethods /></ProtectedPage>} />
      <Route path="/host-reviews" element={<ProtectedPage><HostReviews /></ProtectedPage>} />
      <Route path="/analytics" element={<ProtectedPage><Analytics /></ProtectedPage>} />
      <Route path="/security" element={<ProtectedPage><Security /></ProtectedPage>} />
      <Route path="/recently-viewed" element={<ProtectedPage><RecentlyViewed /></ProtectedPage>} />
      <Route path="/host-profile" element={<ProtectedPage><HostProfile /></ProtectedPage>} />
      <Route path="/host-profile/:id" element={<ProtectedPage><HostProfile /></ProtectedPage>} />

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
<Route path="trips" element={<AdminTrips />} />
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
  <Route path="refunds" element={<AdminRefunds />} />
</Route>
      <Route path="*" element={<NotFound />} />

      </Routes>
      </Suspense>
    </>
  );
}
