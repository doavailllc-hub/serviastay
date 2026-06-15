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