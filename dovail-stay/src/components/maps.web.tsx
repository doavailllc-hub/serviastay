import React, { forwardRef, useImperativeHandle } from "react";
import { View, type ViewProps } from "react-native";

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type WebMapProps = ViewProps & {
  children?: React.ReactNode;
};

export type WebMapHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
};

const WebMap = forwardRef<WebMapHandle, WebMapProps>(
  ({ children, ...props }, ref) => {
    useImperativeHandle(ref, () => ({
      animateToRegion: () => {},
    }));

    return <View {...props}>{children}</View>;
  }
);

WebMap.displayName = "WebMap";

export const Marker = ({ children }: { children?: React.ReactNode }) => (
  <>{children}</>
);

export const PROVIDER_GOOGLE = "google";

export default WebMap;
