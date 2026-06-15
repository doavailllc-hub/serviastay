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
import AdminDashboard from "./pages/AdminDashboard";
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
function ProtectedPage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
export default function App() {
  return (
    <Routes>

      {/* ========= PUBLIC ROUTES ========= */}

      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/search-results" element={<SearchResults />} />
      <Route path="/reserve/:id" element={<ResortDetails />} />
      <Route path="/service/:id" element={<ServiceDetails />} />
      <Route
        path="/service-booking/:id"
        element={<ServiceBookingDetails />}
      />

      <Route path="/experiences" element={<Experience />} />
      <Route path="/services" element={<Services />} />
      <Route path="/help" element={<HelpCenter />} />



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
        path="/wishlist"
        element={
          <ProtectedPage>
            <Wishlist />
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
        path="/add-property"
        element={
          <ProtectedPage>
            <AddProperty />
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

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="users" element={<AdminDashboard />} />
        <Route path="properties" element={<AdminDashboard />} />
        <Route path="bookings" element={<AdminDashboard />} />
        <Route path="payments" element={<PaymentHistory />} />
      </Route>

      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}