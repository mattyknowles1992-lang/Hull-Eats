import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomerProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  account_status: string;
  marketing_opt_in?: boolean;
  preferred_delivery_plan?: string;
};

export type CustomerAddressRow = {
  id: string;
  label: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postcode: string;
  delivery_notes: string | null;
  is_default: boolean;
};

export type CustomerOrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  total_amount: number | string;
  currency: string;
  placed_at: string;
  store_id: string;
};

export type CustomerAccountSnapshot = {
  profile: CustomerProfileRow;
  addresses: CustomerAddressRow[];
  orders: CustomerOrderRow[];
};

const completedOrderStatuses = new Set(["delivered", "cancelled", "rejected"]);

export function splitOrders(orders: CustomerOrderRow[]) {
  return {
    current: orders.filter((order) => !completedOrderStatuses.has(order.status)),
    previous: orders.filter((order) => completedOrderStatuses.has(order.status)),
  };
}

export async function fetchCustomerAccount(supabase: SupabaseClient): Promise<CustomerAccountSnapshot | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    return null;
  }

  const { data: profileData, error: profileError } = await supabase
    .from("customer_profiles")
    .select("id,email,full_name,phone,account_status,marketing_opt_in,preferred_delivery_plan")
    .eq("supabase_auth_user_id", userId)
    .single();

  if (profileError || !profileData) {
    return null;
  }

  const profile = profileData as CustomerProfileRow;

  const { data: addressData } = await supabase
    .from("customer_addresses")
    .select("id,label,address_line_1,address_line_2,city,postcode,delivery_notes,is_default")
    .eq("customer_profile_id", profile.id)
    .order("is_default", { ascending: false });

  const { data: profileOrderData } = await supabase
    .from("orders")
    .select("id,order_number,status,payment_status,payment_method,total_amount,currency,placed_at,store_id")
    .eq("customer_profile_id", profile.id)
    .order("placed_at", { ascending: false });

  const { data: emailOrderData } = await supabase
    .from("orders")
    .select("id,order_number,status,payment_status,payment_method,total_amount,currency,placed_at,store_id")
    .is("customer_profile_id", null)
    .eq("customer_email", profile.email)
    .order("placed_at", { ascending: false });

  const orderMap = new Map<string, CustomerOrderRow>();
  [...((profileOrderData ?? []) as CustomerOrderRow[]), ...((emailOrderData ?? []) as CustomerOrderRow[])].forEach(
    (order) => {
      orderMap.set(order.id, order);
    },
  );

  const orders = Array.from(orderMap.values()).sort(
    (first, second) => Date.parse(second.placed_at) - Date.parse(first.placed_at),
  );

  return {
    profile,
    addresses: (addressData ?? []) as CustomerAddressRow[],
    orders,
  };
}

export async function updateCustomerProfileDetails(
  supabase: SupabaseClient,
  profileId: string,
  patch: { fullName: string; phone: string; email?: string },
) {
  const full_name = patch.fullName.trim();
  const phone = patch.phone.trim();
  const email = patch.email?.trim();

  const profilePatch: Record<string, string> = {
    full_name,
    phone,
    updated_at: new Date().toISOString(),
  };

  if (email) {
    profilePatch.email = email;
  }

  const { error } = await supabase.from("customer_profiles").update(profilePatch).eq("id", profileId);

  if (error) {
    throw error;
  }

  const authPatch: { email?: string; data: { full_name: string; phone: string } } = {
    data: { full_name, phone },
  };

  if (email) {
    authPatch.email = email;
  }

  const { error: authError } = await supabase.auth.updateUser(authPatch);

  if (authError) {
    throw authError;
  }
}

export async function requestPasswordResetEmail(supabase: SupabaseClient, email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) {
    throw error;
  }
}

export async function updateSignedInPassword(supabase: SupabaseClient, newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw error;
  }
}

export type NewAddressInput = {
  label: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  fullName: string;
  city: string;
  postcode: string;
  deliveryNotes: string;
  makeDefault: boolean;
};

export async function addCustomerAddress(supabase: SupabaseClient, profileId: string, input: NewAddressInput) {
  if (input.makeDefault) {
    await supabase.from("customer_addresses").update({ is_default: false }).eq("customer_profile_id", profileId);
  }

  const { data, error } = await supabase
    .from("customer_addresses")
    .insert({
      customer_profile_id: profileId,
      label: input.label.trim() || "Home",
      type: "home",
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      address_line_1: input.addressLine1.trim(),
      address_line_2: input.addressLine2.trim() || null,
      city: input.city.trim(),
      postcode: input.postcode.trim(),
      delivery_notes: input.deliveryNotes.trim() || null,
      is_default: input.makeDefault,
    })
    .select("id,label,address_line_1,address_line_2,city,postcode,delivery_notes,is_default")
    .single();

  if (error || !data) {
    throw error ?? new Error("Could not save address.");
  }

  if (input.makeDefault) {
    await supabase.from("customer_profiles").update({ default_address_id: data.id }).eq("id", profileId);
  }

  return data as CustomerAddressRow;
}

export async function setDefaultCustomerAddress(supabase: SupabaseClient, profileId: string, addressId: string) {
  await supabase.from("customer_addresses").update({ is_default: false }).eq("customer_profile_id", profileId);
  await supabase.from("customer_addresses").update({ is_default: true }).eq("id", addressId).eq("customer_profile_id", profileId);
  await supabase.from("customer_profiles").update({ default_address_id: addressId }).eq("id", profileId);
}
