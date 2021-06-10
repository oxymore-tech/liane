import React from "react";
import { View } from "react-native";
import { Icon } from "react-native-elements";
import tailwind from "tailwind-rn";
import { AppText } from "@components/base/AppText";
import { AppButton } from "@components/base/AppButton";

interface PermissionDisclaimerProps {
  onAccept?: () => void;
}

export function PermissionDisclaimer({ onAccept }: PermissionDisclaimerProps) {
  return (
    <View style={tailwind("container")}>

      <View style={tailwind("pt-8 items-center")}>
        <View style={tailwind("bg-blue-200 px-3 py-1")}>
          <AppText style={tailwind("text-blue-800 text-xl font-semibold")}>
            Liane a besoin de votre autorisation pour enregistrer vos trajets.
          </AppText>
          <AppText style={tailwind("text-blue-800 text-xl font-semibold")}>
            Nous n'enregistrons que les trajets susceptibles d'être réalisés en covoiturage.
          </AppText>
          <AppText style={tailwind("text-blue-800 text-xl font-semibold")}>
            Un trajet "covoiturage" est un parcours qui débute et termine par un point de "prise en charge".
            Les "points de prise en charge" sont définis par le modérateur de l'application.
          </AppText>
          <AppText style={tailwind("text-blue-800 text-xl font-semibold")}>
            Les trajets sont anonymisés et consultables sur le site.
          </AppText>
          <AppText style={tailwind("text-blue-800 text-xl font-semibold")}>
            Si vous le souhaitez vous pouvez effacer l'hitorique de vos trajets.
          </AppText>
        </View>
      </View>
      <View>
        <View style={tailwind("p-8")}>
          <AppButton
            icon={(
              <Icon
                name="check"
                size={40}
                color="white"
                type="font-awesome"
              />
            )}
            onPress={() => onAccept && onAccept()}
            title="Activer"
          />
        </View>
      </View>
    </View>
  );
}
