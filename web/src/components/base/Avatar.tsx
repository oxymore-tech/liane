import React from "react";

export interface UserInfo {
  readonly name: string;
  readonly photo?: string;
}

export interface AvatarProps {
  small?: boolean;
  user: UserInfo
}

export function Avatar({small, user}: AvatarProps) {
  const size = small ? "h-5 w-5" : "h-10 w-10";
  return <div
    className={`inline-block overflow-hidden bg-white shadow-md rounded-full bg-gray-300 ${size}`}>
    <img
      className="w-full h-full object-cover"
      src={user.photo || "/images/empty-avatar.png"} alt={user.name}
      title={user.name}/>
  </div>;
}
