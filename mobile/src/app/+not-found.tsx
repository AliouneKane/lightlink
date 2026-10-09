import { router } from "expo-router";
import { Screen, Txt, Button } from "@/components/ui";
export default function NotFound() {
  return (
    <Screen title="Ce chemin s’arrête ici">
      <Txt>
        L’écran demandé n’existe pas. Retrouvez votre quartier depuis l’accueil.
      </Txt>
      <Button label="Revenir à l’accueil" onPress={() => router.replace("/")} />
    </Screen>
  );
}
