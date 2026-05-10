/**
 * Launch: every signup stores pay-as-you-go in auth metadata / customer_profiles.
 * Hull Eats+ and plan selection stay in the database and triggers for a later phase.
 */
export const CUSTOMER_SIGNUP_DELIVERY_PLAN = "pay_as_you_go" as const;
