import React from "react";
import { View, Text, StyleSheet, FlatList, Image } from "react-native";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors"; // Vous pouvez utiliser une bibliothèque d'icônes comme react-native-vector-icons

interface Member {
  id: string;
  name: string;
  location: string;
  time: string;
  image: string | null;
  isMe: boolean;
}

const members: Member[] = [
  {
    id: "1",
    name: "Moi",
    location: "Mende → Ispagnac",
    time: "Lun, Mar. 10h",
    image: null, // Vous pouvez utiliser une image locale ou une URL
    isMe: true
  },
  {
    id: "2",
    name: "Jacques N.",
    location: "Mende → Ispagnac",
    time: "Lun, Mar. 10h",
    image: "https://example.com/jacques.jpg", // Remplacez par l'URL de l'image
    isMe: false
  },
  {
    id: "3",
    name: "Samuel T.",
    location: "Mende → Balsièges",
    time: "Lun, Mar. 10h",
    image: "https://example.com/samuel.jpg", // Remplacez par l'URL de l'image
    isMe: false
  }
];

// @ts-ignore
const MemberItem = ({ member }) => (
  <View style={styles.memberContainer}>
    <View style={styles.memberInfo}>
      <View style={styles.avatarContainer}>
        {member.image ? (
          <Image source={{ uri: member.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <AppIcon name={"cloud"} />
          </View>
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.nameText}>{member.name}</Text>
        <Text style={styles.locationText}>{member.location}</Text>
        <Text style={styles.timeText}>{member.time}</Text>
      </View>
    </View>
    <AppIcon name={"more-vertical"} />
  </View>
);

export const MembersView = () => {
  console.log("rfeergergergergergregerger er gerg er");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Membres (3)</Text>
      <FlatList data={members} renderItem={({ item }) => <MemberItem member={item} />} keyExtractor={item => item.id} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16
  },
  memberContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.white,
    padding: 16,
    marginBottom: 8,
    borderRadius: 8
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  avatarContainer: {
    marginRight: 16
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  defaultAvatar: {
    backgroundColor: AppColors.primaryColor,
    justifyContent: "center",
    alignItems: "center"
  },
  textContainer: {
    flex: 1
  },
  nameText: {
    fontSize: 16,
    fontWeight: "bold"
  },
  locationText: {
    fontSize: 14,
    color: AppColors.lightGrayBackground
  },
  timeText: {
    fontSize: 14,
    color: AppColors.lightGrayBackground
  }
});
