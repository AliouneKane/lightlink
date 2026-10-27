import { router } from "expo-router";
import { Screen, Txt, Button } from "@/components/ui";
export default function NotFound() {
  return (
    <Screen title="This path ends here">
      <Txt>
        The requested screen does not exist. Find your neighbourhood from the
        home screen.
      </Txt>
      <Button label="Back to home" onPress={() => router.replace("/")} />
    </Screen>
  );
}
