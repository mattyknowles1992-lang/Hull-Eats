export type DeepPartial<T> = T extends string
  ? T
  : T extends readonly (infer U)[]
    ? readonly U[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

export const deepMergeMessages = <T extends Record<string, unknown>>(base: T, override: DeepPartial<T>): T => {
  const result = { ...base } as T;
  const overrideRecord = override as Record<string, unknown>;

  for (const key of Object.keys(overrideRecord)) {
    const overrideValue = overrideRecord[key];
    const baseValue = (base as Record<string, unknown>)[key];

    if (overrideValue === undefined) {
      continue;
    }

    if (
      typeof overrideValue === "object" &&
      overrideValue !== null &&
      !Array.isArray(overrideValue) &&
      typeof baseValue === "object" &&
      baseValue !== null &&
      !Array.isArray(baseValue)
    ) {
      (result as Record<string, unknown>)[key] = deepMergeMessages(
        baseValue as Record<string, unknown>,
        overrideValue as DeepPartial<Record<string, unknown>>,
      );
      continue;
    }

    (result as Record<string, unknown>)[key] = overrideValue;
  }

  return result;
};
