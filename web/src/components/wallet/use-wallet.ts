import { useQuery } from "@tanstack/react-query";
import { getWallet } from "@/api/wallet";
import { useAppContext } from "@/components/context-provider";

export const walletKey = (userId: string | undefined) => ["wallet", userId];

export const useWallet = () => {
  const { user } = useAppContext();
  return useQuery({
    queryKey: walletKey(user?.id),
    queryFn: getWallet,
    enabled: Boolean(user),
  });
};
