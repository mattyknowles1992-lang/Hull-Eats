"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { deliveryFeeFromForStorefront, type StoreSummary } from "@hull-eats/types";

type FeaturedStoreCarouselProps = {
  stores: StoreSummary[];
  storeDistances?: Map<string, number>;
  formatDistance?: (distanceKm: number) => string;
};

function getStoreStatus(storefrontStatus: string, isOpen: boolean) {
  if (storefrontStatus === "onboarding") {
    return "Onboarding";
  }
  if (!isOpen) {
    return "Closed";
  }
  return "Open now";
}

function getStoreStatusTone(storefrontStatus: string, isOpen: boolean) {
  if (storefrontStatus === "onboarding") {
    return "pending";
  }
  return isOpen ? "accepted" : "rejected";
}

export function FeaturedStoreCarousel({ stores, storeDistances, formatDistance }: FeaturedStoreCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const canNavigate = stores.length > 1;

  const syncActiveIndexFromScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const track = viewport.querySelector<HTMLElement>(".featured-carousel-track");
    const slides = track?.querySelectorAll<HTMLElement>(".featured-carousel-slide");
    if (!slides?.length) {
      return;
    }

    const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, index) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(slideCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    syncActiveIndexFromScroll();
    viewport.addEventListener("scroll", syncActiveIndexFromScroll, { passive: true });
    window.addEventListener("resize", syncActiveIndexFromScroll);

    return () => {
      viewport.removeEventListener("scroll", syncActiveIndexFromScroll);
      window.removeEventListener("resize", syncActiveIndexFromScroll);
    };
  }, [stores.length, syncActiveIndexFromScroll]);

  const scrollToIndex = useCallback((index: number) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const slide = viewport.querySelectorAll<HTMLElement>(".featured-carousel-slide")[index];
    if (!slide) {
      return;
    }

    const targetLeft = slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2;
    viewport.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    setActiveIndex(index);
  }, []);

  const goPrevious = useCallback(() => {
    const nextIndex = activeIndex <= 0 ? stores.length - 1 : activeIndex - 1;
    scrollToIndex(nextIndex);
  }, [activeIndex, scrollToIndex, stores.length]);

  const goNext = useCallback(() => {
    const nextIndex = activeIndex >= stores.length - 1 ? 0 : activeIndex + 1;
    scrollToIndex(nextIndex);
  }, [activeIndex, scrollToIndex, stores.length]);

  return (
    <div className="featured-carousel" data-active-index={activeIndex}>
      {canNavigate ? (
        <div className="featured-carousel-controls" aria-hidden={false}>
          <button type="button" className="featured-carousel-nav featured-carousel-nav-prev" onClick={goPrevious} aria-label="Previous featured business">
            <span aria-hidden="true">‹</span>
          </button>
          <button type="button" className="featured-carousel-nav featured-carousel-nav-next" onClick={goNext} aria-label="Next featured business">
            <span aria-hidden="true">›</span>
          </button>
        </div>
      ) : null}

      <div className="featured-carousel-viewport" ref={viewportRef} aria-label="Featured businesses carousel" tabIndex={canNavigate ? 0 : undefined}>
        <div className="featured-carousel-track">
          {stores.map((store, index) => {
            const distanceKm = storeDistances?.get(store.slug);
            const deliveryFrom = deliveryFeeFromForStorefront({
              legacyDeliveryFee: store.deliveryFee,
              pricing: store.deliveryPricing,
            }).toFixed(2);

            return (
              <article
                key={store.id}
                className="featured-carousel-slide"
                aria-hidden={index !== activeIndex && canNavigate}
                data-active={index === activeIndex ? "true" : "false"}
              >
                <Link href={`/stores/${store.slug}`} className="featured-carousel-card">
                  <div
                    className="featured-carousel-media"
                    style={{
                      backgroundImage: `linear-gradient(125deg, rgba(8, 14, 24, 0.08), rgba(8, 14, 24, 0.42) 48%, rgba(8, 14, 24, 0.82)), url(${store.heroImageUrl})`,
                    }}
                  >
                    <div className="featured-carousel-media-top">
                      <span className="featured-carousel-badge">Featured</span>
                      <span className={`status-chip ${getStoreStatusTone(store.storefrontStatus, store.isOpen)}`}>
                        {getStoreStatus(store.storefrontStatus, store.isOpen)}
                      </span>
                    </div>

                    <div className="featured-carousel-media-copy">
                      <p className="featured-carousel-eyebrow">{store.cuisineLabel}</p>
                      <h3>{store.name}</h3>
                      {store.onboardingMessage?.trim() ? <p className="featured-carousel-tagline">{store.onboardingMessage}</p> : null}
                    </div>
                  </div>

                  <div className="featured-carousel-panel">
                    <div className="featured-carousel-stats" aria-label={`${store.name} delivery details`}>
                      <span>{store.etaMinutes} min</span>
                      <span>Min £{store.minimumOrderAmount?.toFixed(2)}</span>
                      <span>Delivery from £{deliveryFrom}</span>
                      {distanceKm !== undefined && formatDistance ? <span>{formatDistance(distanceKm)} away</span> : null}
                    </div>

                    <div className="featured-carousel-panel-footer">
                      <span className="featured-carousel-cta">
                        {store.menuSetupComplete ? "Order now" : "Preview menu"}
                      </span>
                      {canNavigate ? <span className="featured-carousel-hint">Swipe for more</span> : null}
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>

      {canNavigate ? (
        <div className="featured-carousel-dots" role="tablist" aria-label="Choose featured business">
          {stores.map((store, index) => (
            <button
              key={store.id}
              type="button"
              role="tab"
              className="featured-carousel-dot"
              aria-selected={index === activeIndex}
              aria-label={`Show ${store.name}`}
              onClick={() => scrollToIndex(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
