ALTER TABLE servia_properties ADD COLUMN is_top_pick TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE servia_properties ADD COLUMN home_display_order INT NOT NULL DEFAULT 0;

ALTER TABLE experiences ADD COLUMN is_top_spot TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE experiences ADD COLUMN show_brand_on_home TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE experiences ADD COLUMN home_display_order INT NOT NULL DEFAULT 0;

ALTER TABLE servia_properties
  ADD INDEX idx_properties_home_picks (is_top_pick, home_display_order);

ALTER TABLE experiences
  ADD INDEX idx_experiences_home_discovery (is_top_spot, show_brand_on_home, home_display_order);
