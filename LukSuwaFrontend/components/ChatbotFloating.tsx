import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SIZE = 60;
const MARGIN = 16;
const TABBAR_ESTIMATE = 80;

export default function ChatbotFloating({ onPress }: { onPress?: () => void }) {
  const insets = useSafeAreaInsets();
  const pan = useRef(new Animated.ValueXY()).current;

  // drag only after long press
  const dragEnabled = useRef(false);

  useEffect(() => {
    const { width, height } = Dimensions.get("window");
    const startX = width - SIZE - MARGIN;
    const startY = height - SIZE - (TABBAR_ESTIMATE + insets.bottom + MARGIN);
    pan.setValue({ x: startX, y: startY });
  }, [insets.bottom, pan]);

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(val, max));

  const panResponder = useRef(
    PanResponder.create({
      // Do NOT capture taps. Only capture when dragEnabled = true
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => dragEnabled.current === true,

      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any).__getValue(),
          y: (pan.y as any).__getValue(),
        });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: () => {
        dragEnabled.current = false; // stop dragging after release
        pan.flattenOffset();

        const { width, height } = Dimensions.get("window");

        const minX = MARGIN;
        const maxX = width - SIZE - MARGIN;

        const minY = insets.top + MARGIN;
        const maxY = height - SIZE - (TABBAR_ESTIMATE + insets.bottom + MARGIN);

        const x = clamp((pan.x as any).__getValue(), minX, maxX);
        const y = clamp((pan.y as any).__getValue(), minY, maxY);

        Animated.spring(pan, {
          toValue: { x, y },
          useNativeDriver: false,
        }).start();
      },

      onPanResponderTerminate: () => {
        dragEnabled.current = false;
        pan.flattenOffset();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.85}
        delayPressIn={0}
        delayLongPress={50}
        onPress={() => {
          // tap always works
          onPress?.();
        }}
        onLongPress={() => {
          // enable drag only after long press
          dragEnabled.current = true;
        }}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", zIndex: 999 },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "#2B9FD8",
    justifyContent: "center",
    alignItems: "center",
    elevation: 7,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
});