import React from "react";
import { View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";

interface PermissionDisclaimerProps {
  onAccept?: () => void;
}

function PermissionDisclaimer({ onAccept }: PermissionDisclaimerProps) {
  return (
    <View className="container">

      <View className="pt-8 items-center">
        <View className="bg-blue-200 px-3 py-1">
          <AppText className="text-blue-800 text-xl font-semibold">
            Liane a besoin de votre autorisation pour enregistrer vos trajets.
          </AppText>
          <AppText className="text-blue-800 text-xl font-semibold">
            Nous n&apos;enregistrons que les trajets susceptibles d&apos;être réalisés en covoiturage.
          </AppText>
          <AppText className="text-blue-800 text-xl font-semibold">
            Un trajet &quot;covoiturage&quot; est un parcours qui débute et termine par un point de &quot;prise en charge&quot;.
            Les &quot;points de prise en charge&quot; sont définis par le modérateur de l&apos;application.
          </AppText>
          <AppText className="text-blue-800 text-xl font-semibold">
            Les trajets sont anonymisés et consultables sur le site.
          </AppText>
          <AppText className="text-blue-800 text-xl font-semibold">
            Si vous le souhaitez vous pouvez effacer l&apos;historique de vos trajets.
          </AppText>
        </View>
      </View>
      <View>
        <View className="p-8">
          <AppButton
            icon="checkmark"
            onPress={() => onAccept && onAccept()}
            title="Activer"
          />
        </View>
      </View>
    </View>
  );
}

export default PermissionDisclaimer;
