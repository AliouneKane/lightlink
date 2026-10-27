import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DemoProvider, useDemo } from "@/providers/demo-provider";
import { ThemeProvider, useTheme } from "@/providers/theme-provider";
import { Button, Screen, Txt } from "@/components/ui";
import { useReducedMotion } from "@/lib/use-reduced-motion";

void SplashScreen.preventAutoHideAsync().catch(() => {});
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DemoProvider>
          <Navigation />
        </DemoProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
function Navigation() {
  const { colors, mode, ready: themeReady } = useTheme();
  const { ready } = useDemo();
  const reducedMotion = useReducedMotion();
  if (!ready || !themeReady)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.canvas,
          gap: 14,
        }}
      >
        <ActivityIndicator color={colors.yellow} />
        <Txt>Getting your neighbourhood ready…</Txt>
      </View>
    );
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
          animation: reducedMotion ? "none" : "default",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="signaler" options={{ presentation: "modal" }} />
        <Stack.Screen name="publier" options={{ presentation: "modal" }} />
        <Stack.Screen name="profil" />
        <Stack.Screen name="previsions" />
        <Stack.Screen name="offre/[id]" />
      </Stack>
    </>
  );
}
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Screen title="A small hiccup">
          <Txt>
            LightLink could not display this screen. Your contributions already
            saved stay on this device.
          </Txt>
          <Button label="Try again" onPress={retry} />
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
