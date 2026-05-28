"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { MenuItem, StoreSummary, StorefrontPromotionBanner } from "@hull-eats/types";
import { customerFacingMenuItemDescription, customerFacingOptionDescription, parseExtraIncludedQuantity } from "@hull-eats/types";

import {
  addConfiguredItemToBasket,
  clearBasket,
  getBasketItemCount,
  getBasketLineDetails,
  getBasketSubtotal,
  getDefaultCustomisationSelection,
  getSelectedQuantityForOption,
  getSelectionValidationErrors,
  getVisibleOptionGroups,
  loadBasket,
  synchroniseSelection,
  type BasketCustomisationSelection,
  type BasketLine,
  type StoreBasket,
} from "../../../src/lib/basket";
import {
  computeDeliveryQuote,
  customerFacingOptionGroupDescription,
  groupMenuItemsBySubGroup,
  DELIVERY_NOT_AVAILABLE_TO_POSTCODE_MESSAGE,
  hubAllowsCollection,
  hubAllowsDelivery,
  normaliseDeliveryPricingForServe,
} from "@hull-eats/types";
import { fetchCustomerDefaultDeliveryPostcode } from "../../../src/lib/customer-default-delivery-postcode";
import { getDeliveryPostcodeForStore, setDeliveryPostcodeForStore } from "../../../src/lib/delivery-postcode";
import {
  getFulfillmentForStore,
  setFulfillmentForStore,
  type FulfillmentPreference,
} from "../../../src/lib/fulfillment-preference";
import { getBrowserSupabaseClient } from "../../../src/lib/supabase-browser";
import { fetchMarketplaceStore } from "../../../src/lib/marketplace";

type MenuCategory = {
  id: string;
  name: string;
  description?: string;
  subGroups?: string[];
  items: MenuItem[];
};

type StoreMenuClientProps = {
  storeId: string;
  storeSlug: string;
  storeName: string;
  storePostcode: string;
  storeAddress?: string;
  storeDeliveryFee?: number;
  storeDeliveryPricing?: StoreSummary["deliveryPricing"];
  storeAcceptsOrders?: boolean;
  categories: MenuCategory[];
  activePromotions?: StorefrontPromotionBanner[];
};

const formatMoney = (value: number) => `£${value.toFixed(2)}`;

function MenuItemPrice({ item }: { item: MenuItem }) {
  const hasOffer =
    item.compareAtPrice != null && item.compareAtPrice > item.price;

  if (!hasOffer) {
    return <strong className="menu-item-price-pill">{formatMoney(item.price)}</strong>;
  }

  return (
    <div className="menu-item-price-offer" aria-label={`Was ${formatMoney(item.compareAtPrice!)}, now ${formatMoney(item.price)}`}>
      <span className="menu-item-price-was">{formatMoney(item.compareAtPrice!)}</span>
      <strong className="menu-item-price-pill menu-item-price-pill-offer">{formatMoney(item.price)}</strong>
    </div>
  );
}

const categoryImageRules = [
  {
    pattern: /burger|smash|patty|beef/i,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /pizza|slice|pepperoni/i,
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /chicken|wings|strips|tenders/i,
    imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /fries|loaded|munch|tray|chips/i,
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /dessert|sweet|cookie|waffle|shake|cake|brownie/i,
    imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /drink|refresh|soda|juice/i,
    imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=82",
  },
  {
    pattern: /hot dog|hotdog|dog/i,
    imageUrl: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=1200&q=82",
  },
];

const defaultCategoryImageUrl =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=82";

const getCategoryImageUrl = (category: MenuCategory) => {
  const searchableText = `${category.name} ${category.description ?? ""}`;
  return categoryImageRules.find((rule) => rule.pattern.test(searchableText))?.imageUrl ?? defaultCategoryImageUrl;
};

const defaultItemImageUrl =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";

/** Each product uses its own photo; category hero is only for the category banner. */
const getItemImageUrl = (item: MenuItem) => item.imageUrl?.trim() || defaultItemImageUrl;

const getGroupCountLabel = (group: MenuItem["optionGroups"][number]) => {
  const minimum = group.isRequired ? Math.max(group.minSelections, 1) : group.minSelections;
  const requirementLabel = minimum > 0 ? `${minimum} required` : "Optional";
  return group.maxSelections ? `${requirementLabel} / max ${group.maxSelections}` : requirementLabel;
};

/** Compact line under the title: lists included parts when present; otherwise a short slice of copy. Full menu description stays on title/tooltip. */
const isMenuItemOrderable = (item: MenuItem, storeAcceptsOrders: boolean) =>
  storeAcceptsOrders && item.isActive && item.stockStatus !== "out_of_stock";

const getMenuItemStatusLabel = (item: MenuItem) => {
  if (!item.isActive) {
    return null;
  }
  if (item.stockStatus === "out_of_stock") {
    return "Sold out";
  }
  if (item.stockStatus === "low_stock") {
    return "Limited availability";
  }
  return null;
};

const getMenuItemListingLine = (item: MenuItem): string | null => {
  const labels = item.components.map((component) => component.label.trim()).filter(Boolean);
  if (labels.length > 0) {
    return labels.join(" · ");
  }

  const description = customerFacingMenuItemDescription(item.description);
  if (!description) {
    return null;
  }

  return description.length > 88 ? `${description.slice(0, 85)}…` : description;
};

const formatBasketLineSubtotal = (line: BasketLine) =>
  formatMoney(Number((line.unitPrice * line.quantity).toFixed(2)));

const summariseBasketLine = (line: BasketLine) => {
  const detailParts: string[] = [];
  if (line.selectedOptions?.length) {
    line.selectedOptions.forEach((option) => {
      detailParts.push(option.quantity > 1 ? `${option.quantity}× ${option.valueName}` : option.valueName);
    });
  }
  if (line.removedComponents?.length) {
    line.removedComponents.forEach((removed) => detailParts.push(`No ${removed.label}`));
  }
  return detailParts.join(" · ");
};

function MenuCategoryChevron({ expanded }: { expanded: boolean }) {
  return (
    <span className={`menu-category-toggle-chevron${expanded ? " is-expanded" : ""}`} aria-hidden="true">
      <svg className="menu-category-toggle-chevron-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function StoreMenuClient({
  storeId,
  storeSlug,
  storeName,
  storePostcode,
  storeAddress,
  storeDeliveryFee,
  storeDeliveryPricing,
  storeAcceptsOrders = true,
  categories,
  activePromotions = [],
}: StoreMenuClientProps) {
  const [basket, setBasket] = useState<StoreBasket | null>(null);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [selection, setSelection] = useState<BasketCustomisationSelection | null>(null);
  const [addedMessage, setAddedMessage] = useState("");
  const [storeIsOpenNow, setStoreIsOpenNow] = useState(storeAcceptsOrders);
  const [isClient, setIsClient] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const [addedItemId, setAddedItemId] = useState("");
  const [basketBarHeight, setBasketBarHeight] = useState(0);
  const [basketExpanded, setBasketExpanded] = useState(false);
  const basketPortalRef = useRef<HTMLDivElement | null>(null);
  const [deliveryPostcodeInput, setDeliveryPostcodeInput] = useState("");
  const [deliveryPostcodeBootstrapDone, setDeliveryPostcodeBootstrapDone] = useState(false);
  const [showPostcodeEditor, setShowPostcodeEditor] = useState(false);
  const deliveryPricing = useMemo(
    () => (storeDeliveryPricing ? normaliseDeliveryPricingForServe(storeDeliveryPricing) : null),
    [storeDeliveryPricing],
  );
  const canChooseDelivery = hubAllowsDelivery(deliveryPricing?.orderFulfillment);
  const canChooseCollection = hubAllowsCollection(deliveryPricing?.orderFulfillment);

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentPreference>("delivery");

  useEffect(() => {
    setStoreIsOpenNow(storeAcceptsOrders);
  }, [storeAcceptsOrders]);

  useEffect(() => {
    let cancelled = false;

    const refreshStoreAvailability = async () => {
      const latestStore = await fetchMarketplaceStore(storeSlug);
      if (!cancelled) {
        setStoreIsOpenNow(Boolean(latestStore?.isOpen));
      }
    };

    void refreshStoreAvailability();
    const intervalId = window.setInterval(() => {
      void refreshStoreAvailability();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [storeSlug]);

  useEffect(() => {
    if (storeIsOpenNow) {
      return;
    }

    setActiveItem(null);
    setSelection(null);
    setBasketExpanded(false);
  }, [storeIsOpenNow]);

  useEffect(() => {
    const saved = getFulfillmentForStore(storeSlug);
    if (canChooseDelivery && !canChooseCollection) {
      setFulfillmentType("delivery");
      setFulfillmentForStore(storeSlug, "delivery");
      return;
    }
    if (!canChooseDelivery && canChooseCollection) {
      setFulfillmentType("pickup");
      setFulfillmentForStore(storeSlug, "pickup");
      return;
    }
    setFulfillmentType(saved);
  }, [storeSlug, canChooseDelivery, canChooseCollection]);

  useEffect(() => {
    const onFulfillment = (event: Event) => {
      const detail = (event as CustomEvent<{ storeSlug?: string; value?: FulfillmentPreference }>).detail;
      if (!detail?.storeSlug || detail.storeSlug === storeSlug) {
        setFulfillmentType(getFulfillmentForStore(storeSlug));
      }
    };
    window.addEventListener("hull-eats-fulfillment-updated", onFulfillment as EventListener);
    return () => window.removeEventListener("hull-eats-fulfillment-updated", onFulfillment as EventListener);
  }, [storeSlug]);

  const setFulfillment = (next: FulfillmentPreference) => {
    if (next === "delivery" && !canChooseDelivery) {
      return;
    }
    if (next === "pickup" && !canChooseCollection) {
      return;
    }
    setFulfillmentType(next);
    setFulfillmentForStore(storeSlug, next);
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const local = getDeliveryPostcodeForStore(storeSlug);
      if (local) {
        if (!cancelled) {
          setDeliveryPostcodeInput(local);
          setDeliveryPostcodeBootstrapDone(true);
        }
        return;
      }

      const fromAccount = await fetchCustomerDefaultDeliveryPostcode();
      if (cancelled) {
        return;
      }

      if (fromAccount) {
        setDeliveryPostcodeForStore(storeSlug, fromAccount);
        setDeliveryPostcodeInput(fromAccount);
      }
      setDeliveryPostcodeBootstrapDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

  useEffect(() => {
    const onPostcode = () => setDeliveryPostcodeInput(getDeliveryPostcodeForStore(storeSlug));
    window.addEventListener("hull-eats-delivery-postcode-updated", onPostcode as EventListener);
    return () => window.removeEventListener("hull-eats-delivery-postcode-updated", onPostcode as EventListener);
  }, [storeSlug]);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "TOKEN_REFRESHED") {
        return;
      }
      void (async () => {
        const local = getDeliveryPostcodeForStore(storeSlug);
        if (local) {
          return;
        }
        const fromAccount = await fetchCustomerDefaultDeliveryPostcode();
        if (fromAccount) {
          setDeliveryPostcodeForStore(storeSlug, fromAccount);
        }
      })();
    });
    return () => subscription.unsubscribe();
  }, [storeSlug]);

  useEffect(() => {
    const sync = () => setBasket(loadBasket(storeSlug));

    sync();
    window.addEventListener("hull-eats-basket-updated", sync as EventListener);

    return () => {
      window.removeEventListener("hull-eats-basket-updated", sync as EventListener);
    };
  }, [storeSlug]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!activeItem || !selection) {
      return;
    }

    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousLeft = document.body.style.left;
    const previousRight = document.body.style.right;
    const previousWidth = document.body.style.width;
    const previousHtmlTouchAction = document.documentElement.style.touchAction;

    document.documentElement.style.touchAction = "none";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.touchAction = previousHtmlTouchAction;
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.left = previousLeft;
      document.body.style.right = previousRight;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [activeItem, selection]);

  useEffect(() => {
    if (!addedMessage) {
      return;
    }

    const messageTimeout = window.setTimeout(() => setAddedMessage(""), 2200);
    const itemTimeout = window.setTimeout(() => setAddedItemId(""), 1200);
    return () => {
      window.clearTimeout(messageTimeout);
      window.clearTimeout(itemTimeout);
    };
  }, [addedMessage]);

  const itemCount = getBasketItemCount(basket);
  const subtotal = getBasketSubtotal(basket);

  const deliveryQuote = useMemo(
    () =>
      computeDeliveryQuote({
        fulfillmentType,
        storeBasePostcode: storePostcode,
        legacyDeliveryFee: storeDeliveryFee,
        pricing: deliveryPricing,
        customerPostcode: deliveryPostcodeInput.trim() || undefined,
      }),
    [fulfillmentType, storePostcode, storeDeliveryFee, deliveryPricing, deliveryPostcodeInput],
  );

  const showFloatingBasket = itemCount > 0 && !activeItem;

  useLayoutEffect(() => {
    if (!isClient || !showFloatingBasket) {
      setBasketBarHeight(0);
      return;
    }

    const node = basketPortalRef.current;
    if (!node) {
      return;
    }

    const measure = () => {
      const next = Math.ceil(node.getBoundingClientRect().height) + 16;
      setBasketBarHeight((current) => (current === next ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, [
    isClient,
    showFloatingBasket,
    subtotal,
    addedMessage,
    basketExpanded,
    deliveryPostcodeInput,
    deliveryQuote.fee,
    deliveryQuote.blocked,
  ]);

  const visibleCategories = useMemo(
    () => (activeCategoryId === "all" ? categories : categories.filter((category) => category.id === activeCategoryId)),
    [activeCategoryId, categories],
  );
  const filteredCategoryId = activeCategoryId === "all" ? null : activeCategoryId;
  const hasSingleCategoryFilter = filteredCategoryId !== null && visibleCategories.length === 1;

  useEffect(() => {
    if (!filteredCategoryId) {
      setExpandedCategoryIds([]);
      return;
    }

    setExpandedCategoryIds((current) => (current.includes(filteredCategoryId) ? current : [...current, filteredCategoryId]));
  }, [filteredCategoryId]);

  const activeDetails =
    activeItem && selection
      ? getBasketLineDetails(activeItem, selection)
      : {
          selectedOptions: [],
          removedComponents: [],
          components: [],
          customisationTotal: 0,
        };

  const visibleOptionGroups = useMemo(
    () => (activeItem && selection ? getVisibleOptionGroups(activeItem, selection.selectedOptionQuantities) : []),
    [activeItem, selection],
  );

  const selectionValidationErrors = useMemo(
    () => (activeItem && selection ? getSelectionValidationErrors(activeItem, selection) : []),
    [activeItem, selection],
  );

  const openCustomise = (item: MenuItem) => {
    if (!isMenuItemOrderable(item, storeIsOpenNow)) {
      return;
    }

    if (item.components.length === 0 && item.optionGroups.length === 0) {
      addConfiguredItemToBasket(
        {
          storeId,
          storeSlug,
          storeName,
        },
        item,
        getDefaultCustomisationSelection(item),
      );
      setAddedMessage(`${item.name} added to your basket`);
      setAddedItemId(item.id);
      return;
    }

    setActiveItem(item);
    setSelection(getDefaultCustomisationSelection(item));
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategoryIds((current) =>
      current.includes(categoryId) ? current.filter((entry) => entry !== categoryId) : [...current, categoryId],
    );
  };

  const closeCustomise = () => {
    setActiveItem(null);
    setSelection(null);
  };

  const toggleRemovedComponent = (componentId: string) => {
    setSelection((current) => {
      if (!current || !activeItem) {
        return current;
      }

      return synchroniseSelection(activeItem, {
        ...current,
        removedComponentIds: current.removedComponentIds.includes(componentId)
          ? current.removedComponentIds.filter((entry) => entry !== componentId)
          : [...current.removedComponentIds, componentId],
      });
    });
  };

  const setOptionQuantity = (
    groupId: string,
    optionId: string,
    selectionMode: "single" | "multiple",
    requestedQuantity: number,
    optionMaxQuantity: number,
  ) => {
    setSelection((current) => {
      if (!current || !activeItem) {
        return current;
      }

      const group = activeItem.optionGroups.find((entry) => entry.id === groupId);

      if (!group) {
        return current;
      }

      if (selectionMode === "single") {
        const nextQuantities = { ...current.selectedOptionQuantities };

        group.options.forEach((option) => {
          delete nextQuantities[option.id];
        });

        if (requestedQuantity > 0) {
          nextQuantities[optionId] = 1;
        }

        return synchroniseSelection(activeItem, {
          ...current,
          selectedOptionQuantities: nextQuantities,
        });
      }

      const nextQuantities = { ...current.selectedOptionQuantities };
      const groupCount = group.options.reduce((sum, option) => sum + (nextQuantities[option.id] ?? 0), 0);
      const currentQuantity = nextQuantities[optionId] ?? 0;
      const desiredQuantity = Math.max(0, Math.min(optionMaxQuantity, requestedQuantity));
      const maximumSelections = group.maxSelections ?? Number.POSITIVE_INFINITY;
      const nextGroupCount = groupCount - currentQuantity + desiredQuantity;

      if (nextGroupCount > maximumSelections) {
        return current;
      }

      if (desiredQuantity === 0) {
        delete nextQuantities[optionId];
      } else {
        nextQuantities[optionId] = desiredQuantity;
      }

      return synchroniseSelection(activeItem, {
        ...current,
        selectedOptionQuantities: nextQuantities,
      });
    });
  };

  const confirmCustomisation = () => {
    if (!activeItem || !selection || selectionValidationErrors.length > 0) {
      return;
    }

    addConfiguredItemToBasket(
      {
        storeId,
        storeSlug,
        storeName,
      },
      activeItem,
      selection,
    );
    setAddedMessage(`${activeItem.name} added to your basket`);
    setAddedItemId(activeItem.id);
    closeCustomise();
  };

  const handleClearBasket = () => {
    clearBasket(storeSlug);
    setBasketExpanded(false);
  };

  const floatingBasketClassName = `basket-banner basket-floating${addedMessage ? " is-pulsing" : ""}${basketExpanded ? " is-expanded" : ""}`;
  const deliveryFeeLabel = deliveryQuote.blocked
    ? "—"
    : deliveryQuote.needsPostcode
      ? `from ${formatMoney(deliveryQuote.fee)}`
      : formatMoney(deliveryQuote.fee);
  const orderTotal =
    fulfillmentType === "pickup" || deliveryQuote.blocked
      ? subtotal
      : Number((subtotal + deliveryQuote.fee).toFixed(2));
  const showDeliveryWarning = fulfillmentType === "delivery" && Boolean(deliveryQuote.blocked && deliveryQuote.reason);
  const checkoutHref =
    fulfillmentType === "pickup" ? `/checkout/${storeSlug}?fulfillment=pickup` : `/checkout/${storeSlug}`;

  const renderFloatingBasket = () => (
    <section className={floatingBasketClassName} aria-label="Your basket">
      <div className="basket-floating-inner">
        {showDeliveryWarning ? (
          <p className="basket-floating-delivery-warn basket-floating-delivery-warn--banner">{deliveryQuote.reason}</p>
        ) : null}

        <div className="basket-floating-compact-row">
          <div className="basket-floating-summary">
            {basketExpanded ? (
              <>
                <p className="eyebrow">Basket ready</p>
                <h3>
                  {itemCount} item{itemCount === 1 ? "" : "s"} / {formatMoney(subtotal)}
                </h3>
                {addedMessage ? <p className="basket-added-message">{addedMessage}</p> : null}
              </>
            ) : (
              <p className="basket-floating-summary-line">
                {itemCount} item{itemCount === 1 ? "" : "s"} / {formatMoney(subtotal)}
              </p>
            )}
          </div>
          <button type="button" className="basket-floating-clear" onClick={handleClearBasket}>
            Clear basket
          </button>
        </div>

        {basketExpanded && basket && basket.items.length > 0 ? (
          <ul className="basket-floating-lines" aria-label="Items in your basket">
            {basket.items.map((line) => {
              const details = summariseBasketLine(line);
              return (
                <li key={line.lineId} className="basket-floating-line">
                  <div className="basket-floating-line-main">
                    <span className="basket-floating-line-qty">
                      {line.quantity}× {line.name}
                    </span>
                    <span className="basket-floating-line-price">{formatBasketLineSubtotal(line)}</span>
                  </div>
                  {details ? <p className="basket-floating-line-details">{details}</p> : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {basketExpanded && itemCount > 0 ? (
          <div className="basket-floating-totals" aria-label="Basket totals">
            {fulfillmentType === "delivery" ? (
            <div className="basket-floating-total-row">
              <span>Delivery</span>
              <strong>{deliveryFeeLabel}</strong>
            </div>
            ) : (
              <div className="basket-floating-total-row">
                <span>Collection</span>
                <strong>No delivery fee</strong>
              </div>
            )}
            <div className="basket-floating-total-row basket-floating-total-grand">
              <span>Total</span>
              <strong>{formatMoney(orderTotal)}</strong>
            </div>
          </div>
        ) : null}

        <div className="basket-floating-cta">
          <button
            type="button"
            className="glass-button basket-floating-toggle"
            onClick={() => setBasketExpanded((current) => !current)}
            aria-expanded={basketExpanded}
          >
            {basketExpanded ? "Show less" : "Show more"}
          </button>
          <Link href={checkoutHref} className="primary-button gold-button basket-floating-checkout">
            Go to checkout
          </Link>
        </div>
      </div>
    </section>
  );

  const floatingBasketPortal =
    isClient && showFloatingBasket
      ? createPortal(
          <div className="basket-floating-viewport" ref={basketPortalRef}>
            {renderFloatingBasket()}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="menu-section-stack">
      {floatingBasketPortal}

      {!storeIsOpenNow ? (
        <article className="store-closed-banner" role="status">
          <h3>Not accepting orders right now</h3>
          <p>The business is either paused or outside its opening hours.</p>
        </article>
      ) : null}

      {canChooseDelivery || canChooseCollection ? (
        <section className="menu-category-filter-panel" aria-label="Order type">
          <div className="menu-category-filter-header">
            <div>
              <p className="eyebrow">How would you like your order?</p>
              <h3>
                {canChooseDelivery && canChooseCollection
                  ? "Delivery or collection"
                  : canChooseDelivery
                    ? "Delivery"
                    : "Collection"}
              </h3>
            </div>
          </div>
          {canChooseDelivery && canChooseCollection ? (
            <div className="menu-category-filter-row fulfillment-toggle-row">
              <button
                type="button"
                className={`filter-pill${fulfillmentType === "delivery" ? " is-active" : ""}`}
                onClick={() => setFulfillment("delivery")}
              >
                Delivery
              </button>
              <button
                type="button"
                className={`filter-pill${fulfillmentType === "pickup" ? " is-active" : ""}`}
                onClick={() => setFulfillment("pickup")}
              >
                Collection
              </button>
            </div>
          ) : null}
          {fulfillmentType === "pickup" && storeAddress ? (
            <p className="muted-copy" style={{ margin: "10px 0 0" }}>
              Collect from <strong>{storeAddress}</strong>
            </p>
          ) : null}
        </section>
      ) : null}

      {fulfillmentType === "delivery" && !deliveryPostcodeBootstrapDone ? (
        <section className="menu-category-filter-panel" aria-live="polite">
          <p className="muted-copy" style={{ margin: 0 }}>
            Checking saved delivery details…
          </p>
        </section>
      ) : fulfillmentType === "delivery" && deliveryPostcodeInput.trim() && !showPostcodeEditor ? (
          <section className="menu-category-filter-panel menu-delivery-known" aria-label="Delivery estimate">
            <div className="menu-category-filter-header">
              <div>
                <p className="eyebrow">Delivery estimate</p>
                <h3>
                  {deliveryQuote.blocked
                    ? deliveryQuote.reason ?? DELIVERY_NOT_AVAILABLE_TO_POSTCODE_MESSAGE
                    : `${formatMoney(deliveryQuote.fee)} delivery to ${deliveryPostcodeInput.trim().toUpperCase()}`}
                </h3>
                <p className="muted-copy" style={{ marginTop: 6 }}>
                  {deliveryQuote.blocked
                    ? "Try another postcode below, or choose a store that delivers to you."
                    : "Your saved postcode is used for basket totals. You can change it anytime."}
                </p>
              </div>
              <button type="button" className="glass-button" onClick={() => setShowPostcodeEditor(true)}>
                Change
              </button>
            </div>
          </section>
        ) : fulfillmentType === "delivery" ? (
          <section className="menu-category-filter-panel" aria-label="Delivery postcode for estimates">
            <div className="menu-category-filter-header">
              <div>
                <p className="eyebrow">Delivery estimate</p>
                <h3>Your postcode</h3>
                <p className="muted-copy" style={{ marginTop: 6 }}>
                  Enter a full UK postcode (e.g. HU3 4AB) to see delivery in your basket. We also save it on this device
                  when you are not signed in.
                </p>
              </div>
              {showPostcodeEditor && getDeliveryPostcodeForStore(storeSlug) ? (
                <button
                  type="button"
                  className="glass-button"
                  onClick={() => {
                    setDeliveryPostcodeInput(getDeliveryPostcodeForStore(storeSlug));
                    setShowPostcodeEditor(false);
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
            <div className="delivery-postcode-row">
              <input
                className="form-input"
                value={deliveryPostcodeInput}
                onChange={(event) => setDeliveryPostcodeInput(event.target.value)}
                placeholder="e.g. HU3 4AB"
                autoComplete="postal-code"
              />
              <button
                type="button"
                className="glass-button"
                onClick={() => {
                  setDeliveryPostcodeForStore(storeSlug, deliveryPostcodeInput);
                  setShowPostcodeEditor(false);
                }}
              >
                Save postcode
              </button>
            </div>
          </section>
        ) : null}

      {activePromotions.length > 0 ? (
        <section className="store-offers-banner-stack" aria-label="Live offers">
          {activePromotions.map((promotion) => (
            <article key={promotion.id} className="store-offers-banner">
              <div className="store-offers-banner-copy">
                <p className="store-offers-banner-eyebrow">Offer</p>
                <h3>{promotion.headline}</h3>
                {promotion.detail ? <p>{promotion.detail}</p> : null}
              </div>
              <span className="store-offers-banner-badge">Live now</span>
            </article>
          ))}
        </section>
      ) : null}

      <section className="menu-category-filter-panel" aria-label="Menu category filters">
        <div className="menu-category-filter-header">
          <div>
            <p className="eyebrow">Menu categories</p>
            <h3>Browse by category</h3>
          </div>
          <span className="store-tag">{categories.length} categories</span>
        </div>
        <div className="menu-category-filter-row">
          <button
            type="button"
            className={`filter-pill${activeCategoryId === "all" ? " is-active" : ""}`}
            onClick={() => setActiveCategoryId("all")}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`filter-pill${activeCategoryId === category.id ? " is-active" : ""}`}
              onClick={() => setActiveCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      {visibleCategories.map((category) => {
        const isFilteredCategory = hasSingleCategoryFilter;
        const isExpanded = hasSingleCategoryFilter || expandedCategoryIds.includes(category.id);

        return (
        <section key={category.id} className={`menu-section-card menu-section-card-visual${isExpanded ? " is-expanded" : ""}`}>
          <div
            className="menu-category-visual"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(7, 9, 13, 0.72), rgba(7, 9, 13, 0.18)), url(${getCategoryImageUrl(category)})`,
            }}
          >
            <div className="menu-category-copy">
              <p className="eyebrow">{storeName}</p>
              <h3>{category.name}</h3>
              {category.description ? <p className="menu-section-copy">{category.description}</p> : null}
            </div>
            {isFilteredCategory ? (
              <span className="store-tag menu-category-count">
                {category.items.length} item{category.items.length === 1 ? "" : "s"}
              </span>
            ) : (
              <button
                type="button"
                className="store-tag menu-category-count menu-category-toggle"
                aria-expanded={isExpanded}
                aria-controls={`menu-category-items-${category.id}`}
                onClick={() => toggleCategoryExpanded(category.id)}
              >
                <span>{isExpanded ? "Hide items" : `Show ${category.items.length} item${category.items.length === 1 ? "" : "s"}`}</span>
                <MenuCategoryChevron expanded={isExpanded} />
              </button>
            )}
          </div>

          {isExpanded ? (
            <div className="menu-category-items-panel" id={`menu-category-items-${category.id}`}>
              {groupMenuItemsBySubGroup(
                category.items,
                (category.subGroups ?? []).map((label) => ({ id: label, label })),
              ).map((section) => (
                <div key={section.label ?? `${category.id}-main`} className="menu-subgroup-block">
                  {section.label ? <h4 className="menu-subgroup-heading">{section.label}</h4> : null}
                  <div className="menu-item-grid">
                    {section.items.map((item) => {
                      const listing = getMenuItemListingLine(item);
                      const fullDescription = customerFacingMenuItemDescription(item.description);
                      const orderable = isMenuItemOrderable(item, storeIsOpenNow);
                      const statusLabel = getMenuItemStatusLabel(item);

                      return (
                        <article
                          key={item.id}
                          className={`menu-item-card menu-item-card-visual${orderable ? "" : " is-unavailable"}`}
                        >
                          <div
                            className="menu-item-image"
                            style={{
                              backgroundImage: `url(${getItemImageUrl(item)})`,
                            }}
                            aria-hidden="true"
                          />
                          <div className="menu-item-content-panel">
                            <div className="menu-item-top">
                              <div className="menu-item-heading-block">
                                <h4 title={fullDescription || undefined}>{item.name}</h4>
                                {listing ? (
                                  <p className="menu-item-summary-line" title={fullDescription || undefined}>
                                    {listing}
                                  </p>
                                ) : null}
                              </div>
                              <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                                {statusLabel ? <span className="menu-item-status-pill">{statusLabel}</span> : null}
                                <MenuItemPrice item={item} />
                              </div>
                            </div>

                            <div className="menu-item-footer">
                              <button
                                type="button"
                                className={`glass-button add-item-button${addedItemId === item.id ? " is-added" : ""}`}
                                disabled={!orderable}
                                onClick={() => openCustomise(item)}
                              >
                                {!storeIsOpenNow
                                  ? "Closed"
                                  : !orderable
                                    ? "Unavailable"
                                    : item.components.length > 0 || item.optionGroups.length > 0
                                      ? "Customise and add"
                                      : "Add"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
        );
      })}

      {showFloatingBasket && isClient ? (
        <div className="basket-viewport-spacer" style={{ height: basketBarHeight }} aria-hidden />
      ) : null}

      {!isClient && showFloatingBasket ? renderFloatingBasket() : null}

      {!isClient && addedMessage && !activeItem ? (
        <section className="basket-banner basket-floating is-pulsing">
          <div>
            <p className="eyebrow">Added to basket</p>
            <h3>{addedMessage}</h3>
          </div>
        </section>
      ) : null}

      {isClient && activeItem && selection
        ? createPortal(
        <div className="customise-modal-backdrop" onClick={closeCustomise}>
          <section className="customise-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="customise-modal-title">
            <div className="customise-modal-scroll">
            <div className="customise-modal-header">
              <div>
                <p className="eyebrow">Customise item</p>
                <h3 id="customise-modal-title">{activeItem.name}</h3>
                <p>{activeItem.description}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeCustomise}>
                Close
              </button>
            </div>

            {activeItem.components.length > 0 ? (
              <section className="customise-block">
                <div className="customise-group-header">
                  <div>
                    <h4>What&apos;s in this item</h4>
                    <p className="customise-group-meta">Included ingredients and removable parts</p>
                  </div>
                </div>

                <div className="customise-choice-stack">
                  {activeItem.components.map((component) => {
                    const removed = selection.removedComponentIds.includes(component.id);

                    return (
                      <label key={component.id} className={`customise-choice ${removed ? "is-removed" : ""}`}>
                        <div>
                          <strong>
                            {component.quantity} x {component.label}
                          </strong>
                          <p>{component.removable ? "Can be removed" : "Included as standard"}</p>
                        </div>
                        {component.removable ? (
                          <button type="button" className="glass-button" onClick={() => toggleRemovedComponent(component.id)}>
                            {removed ? "Add back" : "Remove"}
                          </button>
                        ) : (
                          <span className="store-tag">Included</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {visibleOptionGroups.map((group) => {
              const groupCopy = customerFacingOptionGroupDescription(group.description);

              return (
              <section key={group.id} className="customise-block">
                <div className="customise-group-header">
                  <div>
                    <h4>{group.name}</h4>
                    <p className="customise-group-meta">{getGroupCountLabel(group)}</p>
                  </div>
                  <span className="store-tag">
                    {group.options.reduce((sum, option) => sum + getSelectedQuantityForOption(selection, option.id), 0)} selected
                  </span>
                </div>

                {groupCopy ? <p className="customise-block-copy">{groupCopy}</p> : null}

                <div className="customise-choice-stack">
                  {group.options.map((option) => {
                    const selectedQuantity = getSelectedQuantityForOption(selection, option.id);
                    const selected = selectedQuantity > 0;
                    const includedFree = parseExtraIncludedQuantity(option.description);
                    const optionNote = customerFacingOptionDescription(option.description);
                    const priceLabel =
                      includedFree > 0 && option.priceDelta > 0
                        ? `${includedFree} included · +${formatMoney(option.priceDelta)} each extra`
                        : includedFree > 0
                          ? `${includedFree} included with item`
                          : option.priceDelta > 0
                            ? `+${formatMoney(option.priceDelta)}`
                            : "Included";

                    return (
                      <label key={option.id} className={`customise-choice ${selected ? "is-selected" : ""}`}>
                        <div>
                          <strong>{option.label}</strong>
                          <p>
                            {priceLabel}
                            {option.maxQuantity > 1 ? ` / up to ${option.maxQuantity}` : ""}
                          </p>
                          {optionNote ? <p className="customise-option-note">{optionNote}</p> : null}
                        </div>

                        {group.selectionMode === "single" ? (
                          <button
                            type="button"
                            className="glass-button"
                            onClick={() => setOptionQuantity(group.id, option.id, group.selectionMode, 1, option.maxQuantity)}
                          >
                            {selected ? "Selected" : "Choose"}
                          </button>
                        ) : (
                          <div className="quantity-stepper">
                            <button
                              type="button"
                              className="glass-button"
                              onClick={() =>
                                setOptionQuantity(group.id, option.id, group.selectionMode, selectedQuantity - 1, option.maxQuantity)
                              }
                              disabled={selectedQuantity === 0}
                            >
                              -
                            </button>
                            <span>{selectedQuantity}</span>
                            <button
                              type="button"
                              className="glass-button"
                              onClick={() =>
                                setOptionQuantity(group.id, option.id, group.selectionMode, selectedQuantity + 1, option.maxQuantity)
                              }
                              disabled={selectedQuantity >= option.maxQuantity}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </section>
              );
            })}

            <section className="customise-summary-card">
              <div className="glance-row">
                <span className="muted-copy">Base item</span>
                <MenuItemPrice item={activeItem} />
              </div>
              <div className="glance-row">
                <span className="muted-copy">Customisations</span>
                <strong>{formatMoney(activeDetails.customisationTotal)}</strong>
              </div>
              <div className="glance-row">
                <span className="muted-copy">Item total</span>
                <strong>{formatMoney(activeItem.price + activeDetails.customisationTotal)}</strong>
              </div>

              {selectionValidationErrors.length > 0 ? (
                <div className="customise-summary-list">
                  <span className="muted-copy">Needs attention</span>
                  {selectionValidationErrors.map((error) => (
                    <strong key={error}>{error}</strong>
                  ))}
                </div>
              ) : null}

              {activeDetails.removedComponents.length > 0 ? (
                <div className="customise-summary-list">
                  <span className="muted-copy">Removed</span>
                  {activeDetails.removedComponents.map((component) => (
                    <strong key={component.componentId}>No {component.label}</strong>
                  ))}
                </div>
              ) : null}

              {activeDetails.selectedOptions.length > 0 ? (
                <div className="customise-summary-list">
                  <span className="muted-copy">Selected</span>
                  {activeDetails.selectedOptions.map((option) => (
                    <strong key={option.valueId}>
                      {option.quantity} x {option.groupName}: {option.valueName}
                    </strong>
                  ))}
                </div>
              ) : null}
            </section>

            </div>

            <div className="customise-modal-footer button-row">
              <button type="button" className="glass-button" onClick={closeCustomise}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={confirmCustomisation}
                disabled={selectionValidationErrors.length > 0}
              >
                Add item
              </button>
            </div>
          </section>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
