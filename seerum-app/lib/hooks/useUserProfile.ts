import { useQuery } from "@tanstack/react-query";
import { UserProfile } from "../types/polymarket";

interface UseUserProfileOptions {
  address: string;
}

export function useUserProfile(options: UseUserProfileOptions) {
  const { address } = options;

  return useQuery<UserProfile>({
    queryKey: ["userProfile", address],
    queryFn: async () => {
      const response = await fetch(`/api/user/profile?address=${address}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      return response.json();
    },
    enabled: !!address,
    refetchInterval: 60000, // Refetch every minute
  });
}

