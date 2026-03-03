"use client";

import { useState, useEffect } from "react";

export type LocationState = {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
};

const DEFAULT_STATE: LocationState = {
  lat: null,
  lng: null,
  accuracy: null,
  loading: true,
  error: null,
};

/**
 * Hook lấy tọa độ GPS realtime qua Web Geolocation API.
 * Tự cập nhật khi thiết bị di chuyển (watchPosition).
 */
export function useLocation(): LocationState {
  const [state, setState] = useState<LocationState>(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return {
        ...DEFAULT_STATE,
        loading: false,
        error: "Trình duyệt không hỗ trợ GPS",
      };
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (err) => {
        let message = "Không thể lấy vị trí";
        if (err.code === err.PERMISSION_DENIED) {
          message = "Bạn cần bật quyền truy cập GPS trong cài đặt trình duyệt";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = "Không thể xác định vị trí hiện tại";
        } else if (err.code === err.TIMEOUT) {
          message = "Quá thời gian lấy vị trí. Vui lòng thử lại";
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 5_000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}
