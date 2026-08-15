ALTER TABLE servia_bookings ADD INDEX idx_booking_property_dates_status (property_id, checkin, checkout, status);
ALTER TABLE servia_property_calendar ADD UNIQUE INDEX uq_property_calendar_date (property_id, calendar_date);
ALTER TABLE experience_bookings ADD INDEX idx_experience_booking_departure_status (departure_id, status);
ALTER TABLE package_departures ADD INDEX idx_departure_experience_date (experience_id, departure_date, status);
ALTER TABLE servia_refund_requests ADD UNIQUE INDEX uq_refund_booking (booking_id);
