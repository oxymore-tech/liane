import React from "react";
import { AppAvatars } from "@/components/UserPicture";
import { CoLiane } from "@liane/common";

export interface GroupsViewProps {
  liane: CoLiane;
}

export const JoinedLianeView = ({ liane }: GroupsViewProps) => {
  const members = liane.members.length > 0 ? liane.members.map(m => m.user) : [liane.createdBy];
  return <AppAvatars users={members} size={28} max={5} />;
};
