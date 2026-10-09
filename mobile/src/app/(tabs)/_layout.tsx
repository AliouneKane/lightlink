import { Tabs } from "expo-router";
import { View } from "react-native";
import {
  House,
  Map,
  PlugZap,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { fonts } from "@/lib/theme";
import { feedback, TabSceneContext } from "@/components/ui";

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const icon = (Icon: LucideIcon) =>
    function TabIcon({ focused }: { focused: boolean }) {
      return (
        <View
          style={{
            width: 48,
            height: 30,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            backgroundColor: focused ? colors.yellow : "transparent",
          }}
        >
          <Icon
            size={21}
            strokeWidth={focused ? 2.3 : 1.7}
            color={focused ? colors.navy : colors.muted}
          />
        </View>
      );
    };
  return (
    <TabSceneContext.Provider value={true}>
      <Tabs
        screenListeners={{ tabPress: () => feedback() }}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.line,
            position: "absolute",
            marginHorizontal: 16,
            bottom: Math.max(insets.bottom, 12),
            borderRadius: 26,
            borderWidth: 1,
            borderColor: colors.line,
            elevation: 12,
            boxShadow: "0px 8px 24px #00000024",
            height: 72,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontFamily: fonts.bold,
            fontSize: 10,
            marginTop: 3,
            lineHeight: 15,
          },
          sceneStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: "Accueil", tabBarIcon: icon(House) }}
        />
        <Tabs.Screen
          name="carte"
          options={{ title: "Carte", tabBarIcon: icon(Map) }}
        />
        <Tabs.Screen
          name="partage"
          options={{ title: "Partage", tabBarIcon: icon(PlugZap) }}
        />
        <Tabs.Screen
          name="communaute"
          options={{ title: "Communauté", tabBarIcon: icon(Users) }}
        />
      </Tabs>
    </TabSceneContext.Provider>
  );
}
