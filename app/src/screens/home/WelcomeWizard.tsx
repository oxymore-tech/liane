import Modal from "react-native-modal/dist/modal";
import { ColorValue, Image, ImageSourcePropType, View } from "react-native";
import { Column, Row } from "@/components/base/AppLayout";
import React, { useContext, useEffect, useState } from "react";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import WelcomeBg from "@/assets/images/tutorial/welcome_bg.svg";
import { AppRoundedButton, AppRoundedButtonOutline } from "@/components/base/AppRoundedButton";
import { AppContext } from "@/components/ContextProvider";
import { shouldShowTutorial } from "@/api/storage";

export const WelcomeWizardModal = () => {
  const { user } = useContext(AppContext);
  const [page, setPage] = useState(0);
  const [show, setShow] = useState(false);
  useEffect(() => {
    shouldShowTutorial("welcome").then(setShow);
  }, [user?.id]);
  return (
    <Modal useNativeDriverForBackdrop={true} isVisible={show} style={{ margin: 0 }}>
      {page === 0 && <WelcomePage1 prev={() => setShow(false)} next={() => setPage(page + 1)} />}
      {page === 1 && <WelcomePageRp prev={() => setPage(page - 1)} next={() => setPage(page + 1)} />}
      {page === 2 && <WelcomePageMap prev={() => setPage(page - 1)} next={() => setPage(page + 1)} />}
      {page === 3 && <WelcomePage4 prev={() => setPage(page - 1)} next={() => setShow(false)} />}
    </Modal>
  );
};

const MapExample = require("../../../assets/images/tutorial/map_example.png");
const RpExample = require("../../../assets/images/tutorial/rallying_point_example.png");
const LinkExample = require("../../../assets/images/tutorial/links_example.png");

const WelcomePage4 = (props: { next: () => void; prev: () => void }) => (
  <View style={{ margin: 16, borderRadius: 8, backgroundColor: AppColors.white, padding: 16, marginVertical: 80, flex: 1 }}>
    <Column spacing={8} style={{ alignItems: "center", flex: 1 }}>
      <Column style={{ padding: 8, flex: 1 }}>
        <AppText style={{ fontSize: 18, fontWeight: "bold" }} numberOfLines={2}>
          Une recherche interactive
        </AppText>
        <Image source={LinkExample} style={{ maxWidth: "100%", resizeMode: "contain", flex: 1 }} />
        <AppText numberOfLines={5} style={{ color: defaultTextColor(AppColors.white), alignSelf: "center", textAlign: "center" }}>
          Sélectionnez un point de ralliement pour voir l'ensemble des territoires desservis. Vous n'avez plus qu'à choisir votre destination !{"\n"}
        </AppText>
      </Column>
      <Dots count={4} selectedIndex={3} color={AppColors.darkBlue} />
      <Row spacing={8} style={{ alignSelf: "flex-end", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
        <AppRoundedButtonOutline color={AppColors.orange} text={"Précédent"} onPress={props.prev} />
        <AppRoundedButton backgroundColor={AppColors.orange} text={"J'ai compris !"} onPress={props.next} />
      </Row>
    </Column>
  </View>
);
const WelcomePageRp = (props: { next: () => void; prev: () => void }) => (
  <View style={{ margin: 16, borderRadius: 8, backgroundColor: AppColors.white, padding: 16, marginVertical: 80, flex: 1 }}>
    <Column spacing={8} style={{ alignItems: "center", flex: 1 }}>
      <Column style={{ padding: 8, flex: 1 }}>
        <AppText style={{ fontSize: 18, fontWeight: "bold" }} numberOfLines={2}>
          Covoiturez en toute confiance
        </AppText>
        <Image source={RpExample} style={{ maxWidth: "100%", resizeMode: "contain", flex: 1 }} />
        <AppText numberOfLines={5} style={{ color: defaultTextColor(AppColors.white), alignSelf: "center", textAlign: "center" }}>
          Liane, c'est plus de 10000 lieux de covoiturages vérifiés, répartis sur tout le territoire français.{"\n"}
        </AppText>
      </Column>
      <Dots count={4} selectedIndex={1} color={AppColors.darkBlue} />
      <Row spacing={8} style={{ alignSelf: "flex-end", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
        <AppRoundedButtonOutline color={AppColors.orange} text={"Précédent"} onPress={props.prev} />
        <AppRoundedButton backgroundColor={AppColors.orange} text={"Suivant"} onPress={props.next} />
      </Row>
    </Column>
  </View>
);

const PointLegend = (props: { iconSource: ImageSourcePropType; legend: string }) => {
  return (
    <Column style={{ alignItems: "center", width: 64 }}>
      <Image source={props.iconSource} style={{ width: 24, height: 24, resizeMode: "contain" }} />
      <AppText style={{ fontSize: 10, maxWidth: 64, textAlign: "center" }} numberOfLines={2}>
        {props.legend}
      </AppText>
    </Column>
  );
};
const WelcomePageMap = (props: { next: () => void; prev: () => void }) => (
  <View style={{ margin: 16, borderRadius: 8, backgroundColor: AppColors.white, padding: 16, marginVertical: 80, flex: 1 }}>
    <Column spacing={8} style={{ alignItems: "center", flex: 1 }}>
      <Column style={{ padding: 8, flex: 1 }}>
        <AppText style={{ fontSize: 18, fontWeight: "bold" }} numberOfLines={2}>
          Tout le réseau Liane en un coup d'oeil
        </AppText>
        <Image source={MapExample} style={{ maxWidth: "100%", resizeMode: "contain", flex: 1 }} />
        <AppText numberOfLines={5} style={{ color: defaultTextColor(AppColors.white), alignSelf: "center", textAlign: "center" }}>
          Utilisez la carte pour visualiser les{" "}
          <AppText style={{ color: AppColors.darkBlue, fontWeight: "bold" }}>routes les plus empruntées</AppText> par les covoitureurs et les points
          de ralliement disponibles.
        </AppText>
        <Row style={{ justifyContent: "center", paddingTop: 8 }}>
          <PointLegend iconSource={require("../../../assets/icons/rp_gray.png")} legend={"Pas de\npassage"} />
          <PointLegend iconSource={require("../../../assets/icons/rp_beige.png")} legend={"Arrêt\npossible"} />
          <PointLegend iconSource={require("../../../assets/icons/rp_orange.png")} legend={"Arrêt\nprévu"} />
        </Row>
      </Column>
      <Dots count={4} selectedIndex={2} color={AppColors.darkBlue} />
      <Row spacing={8} style={{ alignSelf: "flex-end", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
        <AppRoundedButtonOutline color={AppColors.orange} text={"Précédent"} onPress={props.prev} />
        <AppRoundedButton backgroundColor={AppColors.orange} text={"Suivant"} onPress={props.next} />
      </Row>
    </Column>
  </View>
);

const WelcomePage1 = (props: { next: () => void; prev: () => void }) => (
  <View style={{ margin: 32, borderRadius: 8, backgroundColor: AppColors.white, transform: [{ translateY: 50 }] }}>
    <View
      style={{
        position: "absolute",
        width: "100%",
        height: 120,
        backgroundColor: "#CEE4FE",
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        transform: [{ translateY: -100 }]
      }}>
      <WelcomeBg width="100%" transform={[{ translateY: -120 }]} />
    </View>
    <Column style={{ padding: 24 }} spacing={8}>
      <AppText style={{ fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>Bienvenue sur Liane !</AppText>

      <AppText numberOfLines={5} style={{ color: defaultTextColor(AppColors.white), alignSelf: "center", textAlign: "center" }}>
        Voici quelques astuces pour vos premiers pas dans l'application.
      </AppText>
    </Column>
    <Column style={{ height: 120, padding: 16, justifyContent: "flex-end" }} spacing={16}>
      <Dots count={4} selectedIndex={0} color={AppColors.darkBlue} />
      <Row spacing={8} style={{ justifyContent: "space-between", alignItems: "center" }}>
        <AppRoundedButtonOutline color={AppColors.orange} text={"Passer le tutoriel"} onPress={props.prev} />
        <AppRoundedButton backgroundColor={AppColors.orange} text={"Commencer"} onPress={props.next} />
      </Row>
    </Column>
  </View>
);

const Dots = (props: { count: number; selectedIndex: number; color: ColorValue }) => {
  return (
    <Row spacing={4} style={{ width: "100%", justifyContent: "center", margin: 4 }}>
      {[...Array(props.count)].map((_, i) => {
        return (
          <View
            key={i}
            style={{ padding: 5, borderRadius: 8, backgroundColor: i === props.selectedIndex ? props.color : AppColorPalettes.gray[400] }}
          />
        );
      })}
    </Row>
  );
};