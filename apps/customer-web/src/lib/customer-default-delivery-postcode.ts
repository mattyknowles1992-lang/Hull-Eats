import { getBrowserSupabaseClient } from "./supabase-browser";

/**
 * Returns the customer's saved delivery postcode when signed in and an address exists.
 * Mirrors checkout address resolution so menu estimates match checkout.
 */
export async function fetchCustomerDefaultDeliveryPostcode(): Promise<string> {
  try {
    const supabase = getBrowserSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      return "";
    }

    const { data: profileData } = await supabase
      .from("customer_profiles")
      .select("id,default_address_id")
      .eq("supabase_auth_user_id", userId)
      .single();

    if (!profileData) {
      return "";
    }

    const profile = profileData as unknown as { id: string; default_address_id: string | null };

    if (profile.default_address_id) {
      const { data: defRow } = await supabase
        .from("customer_addresses")
        .select("postcode")
        .eq("id", profile.default_address_id)
        .maybeSingle();
      const pc = (defRow as { postcode?: string } | null)?.postcode?.trim();
      if (pc) {
        return pc;
      }
    }

    const { data: addressData } = await supabase
      .from("customer_addresses")
      .select("postcode")
      .eq("customer_profile_id", profile.id)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (addressData as { postcode?: string } | null)?.postcode?.trim() ?? "";
  } catch {
    return "";
  }
}
