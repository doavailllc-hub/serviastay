export const AMENITY_GROUPS = [
  {
    title: "Essentials",
    items: [
      ["wifi", "Wi-Fi"], ["tv", "TV"], ["kitchen", "Kitchen"],
      ["ac", "Air conditioning"], ["heating", "Heating"],
      ["hot_water", "Hot water"], ["electricity", "Electricity"],
      ["cleaning_products", "Cleaning products"], ["basic_toiletries", "Basic toiletries"],
      ["private_entrance", "Private entrance"],
    ],
  },
  {
    title: "Bathroom",
    items: [
      ["bathtub", "Bathtub"], ["shower", "Shower"], ["bidet", "Bidet"],
      ["hair_dryer", "Hair dryer"], ["shampoo", "Shampoo"],
      ["conditioner", "Conditioner"], ["body_soap", "Body soap"],
      ["outdoor_shower", "Outdoor shower"], ["bathrobes", "Bathrobes"],
      ["towels", "Towels"],
    ],
  },
  {
    title: "Bedroom and laundry",
    items: [
      ["washer", "Washing machine"], ["dryer", "Dryer"], ["iron", "Iron"],
      ["clothes_rack", "Clothes rack"], ["wardrobe", "Wardrobe"],
      ["bed_linen", "Bed linen"], ["extra_pillows", "Extra pillows and blankets"],
      ["room_darkening_shades", "Room-darkening shades"],
      ["safe", "Safe"], ["laundry_service", "Laundry service"],
    ],
  },
  {
    title: "Entertainment",
    items: [
      ["streaming_services", "Streaming services"], ["sound_system", "Sound system"],
      ["books", "Books and reading material"], ["board_games", "Board games"],
      ["game_console", "Game console"], ["cinema", "Private cinema"],
      ["piano", "Piano"], ["pool_table", "Pool table"],
    ],
  },
  {
    title: "Kitchen and dining",
    items: [
      ["refrigerator", "Refrigerator"], ["freezer", "Freezer"], ["microwave", "Microwave"],
      ["oven", "Oven"], ["stove", "Stove"], ["dishwasher", "Dishwasher"],
      ["coffee_maker", "Coffee maker"], ["kettle", "Electric kettle"],
      ["toaster", "Toaster"], ["rice_cooker", "Rice cooker"],
      ["dining_table", "Dining table"], ["cooking_basics", "Cooking basics"],
    ],
  },
  {
    title: "Heating and cooling",
    items: [
      ["ceiling_fan", "Ceiling fan"], ["portable_fan", "Portable fan"],
      ["fireplace", "Indoor fireplace"], ["portable_heater", "Portable heater"],
      ["central_heating", "Central heating"], ["central_ac", "Central air conditioning"],
      ["window_ac", "Window air conditioner"], ["thermostat", "Thermostat"],
    ],
  },
  {
    title: "Home safety",
    items: [
      ["security", "Security cameras"], ["smoke_alarm", "Smoke alarm"],
      ["carbon_monoxide_alarm", "Carbon monoxide alarm"],
      ["fire_extinguisher", "Fire extinguisher"], ["first_aid_kit", "First-aid kit"],
      ["lockbox", "Lockbox"], ["smart_lock", "Smart lock"],
      ["security_guard", "Security guard"], ["emergency_exit", "Emergency exit"],
    ],
  },
  {
    title: "Internet and office",
    items: [
      ["dedicated_workspace", "Dedicated workspace"], ["desk", "Desk"],
      ["office_chair", "Office chair"], ["ethernet", "Ethernet connection"],
      ["pocket_wifi", "Pocket Wi-Fi"], ["printer", "Printer"],
      ["monitor", "External monitor"],
    ],
  },
  {
    title: "Outdoor",
    items: [
      ["balcony", "Private balcony"], ["patio", "Patio"], ["garden", "Garden"],
      ["backyard", "Backyard"], ["outdoor_furniture", "Outdoor furniture"],
      ["outdoor_dining", "Outdoor dining area"], ["bbq", "BBQ grill"],
      ["fire_pit", "Fire pit"], ["hammock", "Hammock"], ["sun_loungers", "Sun loungers"],
    ],
  },
  {
    title: "Parking and facilities",
    items: [
      ["parking", "Free parking"], ["paid_parking", "Paid parking"],
      ["ev_charger", "EV charger"], ["pool", "Swimming pool"],
      ["hot_tub", "Hot tub"], ["gym", "Gym"], ["sauna", "Sauna"],
      ["lift", "Lift"], ["shared_lounge", "Shared lounge"], ["rooftop", "Rooftop access"],
    ],
  },
  {
    title: "Accessibility",
    items: [
      ["step_free_entrance", "Step-free entrance"], ["wide_entrance", "Wide entrance"],
      ["accessible_parking", "Accessible parking"], ["step_free_bedroom", "Step-free bedroom"],
      ["wide_hallway", "Wide hallway"], ["accessible_bathroom", "Accessible bathroom"],
      ["shower_grab_rails", "Shower grab rails"], ["shower_chair", "Shower chair"],
      ["accessible_lift", "Accessible lift"],
    ],
  },
  {
    title: "Family",
    items: [
      ["cot", "Cot"], ["high_chair", "High chair"], ["baby_bath", "Baby bath"],
      ["baby_monitor", "Baby monitor"], ["childrens_books", "Children's books and toys"],
      ["childrens_dinnerware", "Children's dinnerware"],
      ["stair_gates", "Stair gates"], ["window_guards", "Window guards"],
    ],
  },
  {
    title: "Services",
    items: [
      ["self_checkin", "Self check-in"], ["reception", "24-hour reception"],
      ["concierge", "Concierge"], ["luggage_dropoff", "Luggage drop-off allowed"],
      ["daily_housekeeping", "Daily housekeeping"], ["breakfast", "Breakfast"],
      ["airport_transfer", "Airport transfer"], ["long_term_stays", "Long-term stays allowed"],
    ],
  },
  {
    title: "Location features",
    items: [
      ["beach_access", "Beach access"], ["waterfront", "Waterfront"],
      ["lake_access", "Lake access"], ["ski_in_out", "Ski-in/ski-out"],
      ["mountain_view", "Mountain view"], ["sea_view", "Sea view"],
      ["city_view", "City skyline view"], ["resort_access", "Resort access"],
    ],
  },
];


export const AMENITY_META = Object.fromEntries(
  AMENITY_GROUPS.flatMap((group) =>
    group.items.map(([key, title]) => [key, { key, title, category: group.title }])
  )
);

export const AMENITY_COUNT = Object.keys(AMENITY_META).length;