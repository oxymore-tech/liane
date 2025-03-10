import React, { useMemo } from "react";
import { AppAvatars } from "@/components/UserPicture";
import { CoLiane } from "@liane/common";

export interface GroupsViewProps {
  liane: CoLiane;
}

export const JoinedLianeView = ({ liane }: GroupsViewProps) => {
  const members = useMemo(() => liane.members.map(m => m.user), [liane]);
  return <AppAvatars users={members} size={28} max={5} />;
};
