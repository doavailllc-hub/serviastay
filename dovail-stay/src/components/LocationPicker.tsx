import * as Location from "expo-location";
import {
    Check,
    Crosshair,
    MapPin,
    Search,
} from "lucide-react-native";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import MapView, {
    Marker,
    PROVIDER_GOOGLE,
    Region,
} from "react-native-maps";

const THEME = "#3b71e6";
const THEME_DARK = "#2f5fc2";
const THEME_LIGHT = "#eef4ff";
const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";
const DANGER = "#d93025";

const DEFAULT_REGION: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 16,
  longitudeDelta: 16,
};

export type LocationPickerValue = {
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
};

type LocationPickerProps = {
  value?: Partial<LocationPickerValue> | null;
  onChange: (location: LocationPickerValue) => void;
  title?: string;
  confirmLabel?: string;
  height?: number;
  required?: boolean;
  disabled?: boolean;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

const isValidCoordinate = (
  latitude?: number,
  longitude?: number
) =>
  typeof latitude === "number" &&
  typeof longitude === "number" &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180 &&
  !(latitude === 0 && longitude === 0);

const buildAddress = (
  result?: Location.LocationGeocodedAddress
) => {
  if (!result) return "Selected location";

  const parts = [
    result.name,
    result.street,
    result.district,
    result.city,
    result.subregion,
    result.region,
    result.postalCode,
    result.country,
  ]
    .map((part) => part?.trim())
    .filter(
      (part, index, values): part is string =>
        Boolean(part) &&
        values.indexOf(part as string) === index
    );

  return parts.join(", ") || "Selected location";
};

export default function LocationPicker({
  value,
  onChange,
  title = "Set your location",
  confirmLabel = "Confirm location",
  height = 330,
  required = true,
  disabled = false,
}: LocationPickerProps) {
  const mapRef = useRef<MapView | null>(null);

  const initialCoordinates = useMemo<Coordinates | null>(() => {
    const latitude = Number(value?.latitude);
    const longitude = Number(value?.longitude);

    if (isValidCoordinate(latitude, longitude)) {
      return {
        latitude,
        longitude,
      };
    }

    return null;
  }, [value?.latitude, value?.longitude]);

  const [coordinates, setCoordinates] =
    useState<Coordinates | null>(
      initialCoordinates
    );

  const [address, setAddress] = useState(
    value?.address?.trim() || ""
  );

  const [query, setQuery] = useState(
    value?.address?.trim() || ""
  );

  const [permissionGranted, setPermissionGranted] =
    useState(false);

  const [loadingLocation, setLoadingLocation] =
    useState(false);

  const [searching, setSearching] =
    useState(false);

  const [resolvingAddress, setResolvingAddress] =
    useState(false);

  const [confirming, setConfirming] =
    useState(false);

  useEffect(() => {
    const latitude = Number(value?.latitude);
    const longitude = Number(value?.longitude);

    if (
      isValidCoordinate(latitude, longitude)
    ) {
      setCoordinates({
        latitude,
        longitude,
      });
    }

    if (value?.address) {
      setAddress(value.address);
      setQuery(value.address);
    }
  }, [
    value?.address,
    value?.latitude,
    value?.longitude,
  ]);

  const requestPermission =
    useCallback(async () => {
      const existing =
        await Location.getForegroundPermissionsAsync();

      if (existing.status === "granted") {
        setPermissionGranted(true);
        return true;
      }

      const requested =
        await Location.requestForegroundPermissionsAsync();

      const granted =
        requested.status === "granted";

      setPermissionGranted(granted);

      if (!granted) {
        Alert.alert(
          "Location permission required",
          "Allow location access to use your current position."
        );
      }

      return granted;
    }, []);

  const resolveAddress =
    useCallback(
      async (
        nextCoordinates: Coordinates
      ) => {
        try {
          setResolvingAddress(true);

          const granted =
            permissionGranted ||
            (await requestPermission());

          if (!granted) {
            setAddress("Selected location");
            return;
          }

          const results =
            await Location.reverseGeocodeAsync(
              nextCoordinates
            );

          const result = results[0];
          const nextAddress =
            buildAddress(result);

          setAddress(nextAddress);
          setQuery(nextAddress);
        } catch (error) {
          console.log(
            "Reverse geocoding error:",
            error
          );

          setAddress("Selected location");
        } finally {
          setResolvingAddress(false);
        }
      },
      [
        permissionGranted,
        requestPermission,
      ]
    );

  const moveMap = useCallback(
    (
      nextCoordinates: Coordinates,
      latitudeDelta = 0.018,
      longitudeDelta = 0.018
    ) => {
      mapRef.current?.animateToRegion(
        {
          ...nextCoordinates,
          latitudeDelta,
          longitudeDelta,
        },
        350
      );
    },
    []
  );

  const useCurrentLocation =
    useCallback(async () => {
      if (disabled || loadingLocation) return;

      try {
        setLoadingLocation(true);

        const granted =
          await requestPermission();

        if (!granted) return;

        const location =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,
            }
          );

        const nextCoordinates = {
          latitude:
            location.coords.latitude,
          longitude:
            location.coords.longitude,
        };

        setCoordinates(nextCoordinates);
        moveMap(nextCoordinates);
        await resolveAddress(
          nextCoordinates
        );
      } catch (error) {
        console.log(
          "Current location error:",
          error
        );

        Alert.alert(
          "Location unavailable",
          "We could not find your current location. Please search or move the pin manually."
        );
      } finally {
        setLoadingLocation(false);
      }
    }, [
      disabled,
      loadingLocation,
      moveMap,
      requestPermission,
      resolveAddress,
    ]);

  useEffect(() => {
    if (initialCoordinates) {
      return;
    }

    useCurrentLocation();
  }, [
    initialCoordinates,
    useCurrentLocation,
  ]);

  const searchLocation =
    useCallback(async () => {
      const cleanQuery = query.trim();

      if (
        disabled ||
        searching ||
        !cleanQuery
      ) {
        return;
      }

      try {
        setSearching(true);
        Keyboard.dismiss();

        const granted =
          permissionGranted ||
          (await requestPermission());

        if (!granted) return;

        const results =
          await Location.geocodeAsync(
            cleanQuery
          );

        const result = results[0];

        if (!result) {
          Alert.alert(
            "Location not found",
            "Try a more specific city, area or address."
          );
          return;
        }

        const nextCoordinates = {
          latitude: result.latitude,
          longitude: result.longitude,
        };

        setCoordinates(nextCoordinates);
        moveMap(nextCoordinates);
        await resolveAddress(
          nextCoordinates
        );
      } catch (error) {
        console.log(
          "Location search error:",
          error
        );

        Alert.alert(
          "Search failed",
          "We could not search for this location. Please try again."
        );
      } finally {
        setSearching(false);
      }
    }, [
      disabled,
      moveMap,
      permissionGranted,
      query,
      requestPermission,
      resolveAddress,
      searching,
    ]);

  const handleMarkerDragEnd =
    useCallback(
      async (
        nextCoordinates: Coordinates
      ) => {
        if (disabled) return;

        setCoordinates(nextCoordinates);
        await resolveAddress(
          nextCoordinates
        );
      },
      [disabled, resolveAddress]
    );

  const handleMapPress = useCallback(
    async (
      nextCoordinates: Coordinates
    ) => {
      if (disabled) return;

      setCoordinates(nextCoordinates);
      await resolveAddress(
        nextCoordinates
      );
    },
    [disabled, resolveAddress]
  );

  const confirmLocation =
    useCallback(async () => {
      if (disabled || confirming) return;

      if (!coordinates) {
        Alert.alert(
          "Choose a location",
          "Search for a place, use your current location or tap the map."
        );
        return;
      }

      if (required && !address.trim()) {
        Alert.alert(
          "Address required",
          "Please wait while the selected address is resolved."
        );
        return;
      }

      try {
        setConfirming(true);

        const results =
          permissionGranted
            ? await Location.reverseGeocodeAsync(
                coordinates
              )
            : [];

        const result = results[0];

        onChange({
          latitude:
            coordinates.latitude,
          longitude:
            coordinates.longitude,
          address:
            address.trim() ||
            buildAddress(result),
          city:
            result?.city ||
            result?.district ||
            undefined,
          state:
            result?.region ||
            result?.subregion ||
            undefined,
          country:
            result?.country ||
            undefined,
          postalCode:
            result?.postalCode ||
            undefined,
        });
      } catch (error) {
        console.log(
          "Confirm location error:",
          error
        );

        onChange({
          latitude:
            coordinates.latitude,
          longitude:
            coordinates.longitude,
          address:
            address.trim() ||
            "Selected location",
        });
      } finally {
        setConfirming(false);
      }
    }, [
      address,
      confirming,
      coordinates,
      disabled,
      onChange,
      permissionGranted,
      required,
    ]);

  const initialRegion: Region =
    coordinates
      ? {
          ...coordinates,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        }
      : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.subtitle}>
        Search for an address, use your
        current location or move the pin.
      </Text>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search
            size={19}
            color={MUTED}
            strokeWidth={2}
          />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city, area or address"
            placeholderTextColor="#9aa0a6"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            editable={!disabled}
            onSubmitEditing={
              searchLocation
            }
            style={styles.searchInput}
          />

          {searching ? (
            <ActivityIndicator
              size="small"
              color={THEME}
            />
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search location"
          onPress={searchLocation}
          disabled={
            disabled ||
            searching ||
            !query.trim()
          }
          style={({ pressed }) => [
            styles.searchButton,
            (disabled ||
              searching ||
              !query.trim()) &&
              styles.disabledButton,
            pressed &&
              styles.buttonPressed,
          ]}
        >
          <Search
            size={20}
            color={WHITE}
          />
        </Pressable>
      </View>

      <View
        style={[
          styles.mapWrap,
          { height },
        ]}
      >
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={
            Platform.OS === "android"
              ? PROVIDER_GOOGLE
              : undefined
          }
          initialRegion={initialRegion}
          showsUserLocation={
            permissionGranted
          }
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          onPress={(event) =>
            handleMapPress(
              event.nativeEvent.coordinate
            )
          }
        >
          {coordinates ? (
            <Marker
              coordinate={coordinates}
              draggable={!disabled}
              onDragEnd={(event) =>
                handleMarkerDragEnd(
                  event.nativeEvent.coordinate
                )
              }
            >
              <View
                style={styles.markerOuter}
              >
                <View
                  style={styles.markerInner}
                >
                  <MapPin
                    size={21}
                    color={WHITE}
                    strokeWidth={2.3}
                  />
                </View>
              </View>
            </Marker>
          ) : null}
        </MapView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use current location"
          onPress={useCurrentLocation}
          disabled={
            disabled || loadingLocation
          }
          style={({ pressed }) => [
            styles.currentLocationButton,
            disabled &&
              styles.disabledButton,
            pressed &&
              styles.buttonPressed,
          ]}
        >
          {loadingLocation ? (
            <ActivityIndicator
              size="small"
              color={THEME}
            />
          ) : (
            <Crosshair
              size={21}
              color={THEME}
              strokeWidth={2}
            />
          )}
        </Pressable>
      </View>

      <View style={styles.addressCard}>
        <View style={styles.addressIcon}>
          <MapPin
            size={20}
            color={THEME}
            strokeWidth={2}
          />
        </View>

        <View style={styles.addressContent}>
          <Text style={styles.addressLabel}>
            SELECTED ADDRESS
          </Text>

          {resolvingAddress ? (
            <View
              style={styles.resolvingRow}
            >
              <ActivityIndicator
                size="small"
                color={THEME}
              />

              <Text
                style={styles.resolvingText}
              >
                Finding address...
              </Text>
            </View>
          ) : (
            <Text
              style={styles.addressText}
            >
              {address ||
                "Tap the map or search for a location"}
            </Text>
          )}

          {coordinates ? (
            <Text style={styles.coordinateText}>
              {coordinates.latitude.toFixed(
                6
              )}
              ,{" "}
              {coordinates.longitude.toFixed(
                6
              )}
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={confirmLocation}
        disabled={
          disabled ||
          confirming ||
          !coordinates ||
          resolvingAddress
        }
        style={({ pressed }) => [
          styles.confirmButton,
          (disabled ||
            confirming ||
            !coordinates ||
            resolvingAddress) &&
            styles.confirmButtonDisabled,
          pressed &&
            styles.buttonPressed,
        ]}
      >
        {confirming ? (
          <ActivityIndicator
            size="small"
            color={WHITE}
          />
        ) : (
          <>
            <Check
              size={19}
              color={WHITE}
              strokeWidth={2.3}
            />

            <Text
              style={styles.confirmButtonText}
            >
              {confirmLabel}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  title: {
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 20,
    lineHeight: 27,
    color: TEXT,
  },

  subtitle: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },

  searchRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchBox: {
    flex: 1,
    minHeight: 54,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: WHITE,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    minHeight: 52,
    marginLeft: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT,
    paddingVertical: 0,
  },

  searchButton: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },

  mapWrap: {
    marginTop: 14,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },

  currentLocationButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },

  markerOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor:
      "rgba(59,113,230,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  markerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: WHITE,
  },

  addressCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: WHITE,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  addressIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  addressContent: {
    flex: 1,
    marginLeft: 12,
  },

  addressLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.7,
    color: MUTED,
  },

  addressText: {
    marginTop: 5,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
    color: TEXT,
  },

  coordinateText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#80868b",
  },

  resolvingRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  resolvingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  confirmButton: {
    minHeight: 52,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: THEME,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  confirmButtonDisabled: {
    backgroundColor: "#b9c8e8",
  },

  confirmButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: WHITE,
  },

  disabledButton: {
    opacity: 0.55,
  },

  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});