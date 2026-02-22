import AsyncStorage from "@react-native-async-storage/async-storage";

export type UiStyle = "nativewind" | "paper";

const UI_STYLE_KEY = "ui_style";

let _cachedStyle: UiStyle | null = null;

export async function getUiStyle(): Promise<UiStyle> {
  if (_cachedStyle) return _cachedStyle;
  const stored = await AsyncStorage.getItem(UI_STYLE_KEY);
  if (stored === "nativewind" || stored === "paper") {
    _cachedStyle = stored;
    return stored;
  }
  _cachedStyle = "nativewind";
  return "nativewind";
}

export async function setUiStyle(style: UiStyle): Promise<void> {
  _cachedStyle = style;
  await AsyncStorage.setItem(UI_STYLE_KEY, style);
}
