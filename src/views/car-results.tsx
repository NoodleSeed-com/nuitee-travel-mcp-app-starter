import "@fontsource-variable/host-grotesk";
import "@noodleseed/one/react/styles.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  XMarkIcon,
  PlusIcon,
  MapPinIcon,
  CalendarDaysIcon,
  UsersIcon,
  BriefcaseIcon,
  BoltIcon,
  KeyIcon,
  InformationCircleIcon,
  TruckIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  Form,
  useCallTool,
  useLayout,
  useOpenExternal,
  useToolInfo,
  useUpdateModelContext,
  useWidgetReady,
} from "../helpers.js";
import type {
  CarOffer,
  CarSearchResult,
  CarSearchInput,
  CarSelection,
} from "../car-schemas.js";
import { isCarSearch, isCarSelection, carDate } from "./car-data.js";
import { carPhotos } from "./car-photos.js";
import { InlineTripReview, isTripPlanningReview } from "./trip-review.js";
import { tripPlanningSnapshot } from "./trip-experience-search.js";
import "./car-results.css";
import "./car-trip.css";
type Car = CarOffer & { id: string; price: number };
const asCar = (car: CarOffer): Car => ({
  ...car,
  id: car.key,
  price: car.dailyPrice.amount,
});
type Screen = "browse" | "detail" | "compare" | "added" | "trip";
const filters = ["All cars", "Xiaomi", "Electric", "Budget picks", "More room"];
const filterIds = ["all", "xiaomi", "electric", "budget", "roomy"] as const;
const dayLabel = (date: string) =>
  new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
const photoKey = (car: Car, index = 0) =>
  car.id + (index ? "-" + (index + 1) : "");
function Photo({
  car,
  className = "",
  index = 0,
}: {
  car: Car;
  className?: string;
  index?: number;
}) {
  const [failed, fail] = useState(false);
  return (
    <div className={"photo " + className} data-car={car.id}>
      {failed ? (
        <div className="photo-fallback">
          <TruckIcon />
          <span>{car.name}</span>
          <small>Photo unavailable</small>
        </div>
      ) : (
        <img
          src={carPhotos[photoKey(car, index)]?.image}
          alt={
            car.name +
            " reference photograph " +
            (index + 1) +
            ", not an actual rental listing"
          }
          onError={() => fail(true)}
        />
      )}
    </div>
  );
}
function CarGallery({ car }: { car: Car }) {
  const openExternal = useOpenExternal();
  const ready = useWidgetReady();
  const [active, setActive] = useState(0);
  const touch = useRef<number | null>(null);
  const move = (direction: number) =>
    setActive((index) => (index + direction + 3) % 3);
  const credit = carPhotos[photoKey(car, active)];
  return (
    <div
      className="car-gallery"
      role="region"
      aria-label={car.name + " photo gallery"}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
    >
      <div
        className="detail-photo"
        onTouchStart={(event) => {
          touch.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (touch.current !== null) {
            const distance = event.changedTouches[0].clientX - touch.current;
            if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
            touch.current = null;
          }
        }}
      >
        <Photo key={photoKey(car, active)} car={car} index={active} />
        <span className="media-label">
          {car.xiaomi ? "Xiaomi collection" : car.kind}
        </span>
        <span className="gallery-count" aria-live="polite">
          {active + 1} / 3
        </span>
        <button
          type="button"
          className="icon-button gallery-arrow previous"
          aria-label="Previous car photo"
          onClick={() => move(-1)}
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          className="icon-button gallery-arrow next"
          aria-label="Next car photo"
          onClick={() => move(1)}
        >
          <ChevronRightIcon />
        </button>
        <button
          type="button"
          className="photo-credit"
          disabled={!ready}
          onClick={() => {
            if (credit) void openExternal(credit.source);
          }}
        >
          Reference photo ·{" "}
          {(credit?.author || "Vehicle reference").slice(0, 45)}
        </button>
      </div>
      <div className="gallery-footer">
        <div className="gallery-thumbnails" aria-label="Choose a car photo">
          {[0, 1, 2].map((index) => (
            <button
              type="button"
              key={index}
              className="gallery-thumbnail"
              aria-label={"Show car photo " + (index + 1)}
              aria-pressed={active === index}
              onClick={() => setActive(index)}
            >
              <Photo car={car} index={index} />
            </button>
          ))}
        </div>
        <p>
          Three views. One possibility.
          <small>
            Model reference photos. Colours and specifications may vary.
          </small>
        </p>
      </div>
    </div>
  );
}

export function CarJourney({
  data: initialData,
  onBack,
  onReview,
}: {
  readonly data: CarSearchResult;
  readonly onBack?: () => void;
  readonly onReview?: () => void;
}) {
  const ready = useWidgetReady(),
    layout = useLayout(),
    updateContext = useUpdateModelContext(),
    openExternal = useOpenExternal();
  const search = useCallTool("search_cars"),
    select = useCallTool("select_car"),
    review = useCallTool("review_trip");
  const [data, setData] = useState(initialData);
  const [screen, setScreen] = useState<Screen>(
    initialData.cars.length === 1 && initialData.searchContext.carName
      ? "detail"
      : "browse",
  );
  const [focusId, setFocusId] = useState(initialData.cars[0]?.key);
  const [filter, setFilter] = useState(
    filters[filterIds.indexOf(initialData.searchContext.filter)]!,
  );
  const [comparison, setComparison] = useState<string[]>([]);
  const [selected, setSelected] = useState<CarSelection | undefined>(
    initialData.selected,
  );
  const [busy, setBusy] = useState(false);
  const [searchState, setSearchState] = useState<
    "ready" | "loading" | "empty" | "error"
  >(
    initialData.status === "success"
      ? "ready"
      : initialData.status === "empty"
        ? "empty"
        : "error",
  );
  const [start, updateStart] = useState(initialData.searchContext.startDate),
    [end, updateEnd] = useState(initialData.searchContext.endDate);
  const [pickup, setPickup] = useState<"airport" | "hotel">(
      initialData.searchContext.pickup,
    ),
    [extra, setExtra] = useState(false);
  const [showEditor, setShowEditor] = useState(false),
    [showCredits, setShowCredits] = useState(false),
    [notice, setNotice] = useState("");
  const [position, setPosition] = useState(0),
    [canNext, setCanNext] = useState(false);
  const track = useRef<HTMLDivElement>(null),
    surface = useRef<HTMLDivElement>(null),
    requestSeq = useRef(0),
    inFlight = useRef(false);
  useEffect(
    () => () => {
      requestSeq.current++;
    },
    [],
  );
  const cars = useMemo(() => data.cars.map(asCar), [data]);
  const focused = cars.find((car) => car.id === focusId) ?? cars[0];
  const visible = useMemo(
    () =>
      searchState === "empty"
        ? []
        : cars.filter((c) =>
            filter === "Xiaomi"
              ? c.xiaomi
              : filter === "Electric"
                ? c.energy === "Electric"
                : filter === "Budget picks"
                  ? ["mini", "yaris", "golf"].includes(c.id)
                  : filter === "More room"
                    ? c.bags >= 3
                    : true,
          ),
    [cars, filter, searchState],
  );
  const comparisonCars = comparison
    .map((id) => cars.find((c) => c.id === id))
    .filter((c): c is Car => !!c);
  const euro = (n: number) =>
    new Intl.NumberFormat(layout.locale ?? "en-GB", {
      style: "currency",
      currency: data.searchContext.currency,
      maximumFractionDigits: data.searchContext.currency === "JPY" ? 0 : 2,
    }).format(n);
  // Unsaved date edits never alter the displayed quote or selection payload.
  const days = data.days,
    pickupFee = data.fees[pickup];
  const total = (car: Car) =>
    car.price * days + pickupFee + (extra ? days * data.fees.driverPerDay : 0);
  const pickupLabel =
    pickup === "airport"
      ? data.searchContext.destination + " Airport"
      : "Your " + data.searchContext.destination + " stay";
  const dateRange =
    dayLabel(data.searchContext.startDate) +
    "–" +
    dayLabel(data.searchContext.endDate);
  const smooth = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? ("instant" as const)
      : ("smooth" as const);
  const setStart = (v: string) => {
      if (carDate(v)) updateStart(v);
    },
    setEnd = (v: string) => {
      if (carDate(v)) updateEnd(v);
    };
  function viewCar(car: Car) {
    setFocusId(car.id);
    setScreen("detail");
    setNotice("");
  }
  function browse(nextFilter = filter) {
    setScreen("browse");
    setFilter(nextFilter);
    setNotice("");
  }
  function chooseFilter(v: string) {
    if (data.searchContext.filter !== "all" || data.searchContext.carName) {
      void searchCars({ filter: filterIds[filters.indexOf(v)], carName: "" });
      return;
    }
    setFilter(v);
    setPosition(0);
    track.current?.scrollTo({ left: 0 });
  }
  function toggleCompare(id: string) {
    setComparison((previous) =>
      previous.includes(id)
        ? previous.filter((v) => v !== id)
        : previous.length < 2
          ? [...previous, id]
          : previous,
    );
    if (!comparison.includes(id) && comparison.length === 2)
      setNotice("Remove one car before comparing another.");
  }
  function scrollCars(direction: number) {
    const el = track.current;
    if (el)
      el.scrollBy({
        left:
          direction *
          ((el.firstElementChild?.getBoundingClientRect().width ?? 330) + 20),
        behavior: smooth(),
      });
  }
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      setPosition(
        Math.round(
          el.scrollLeft /
            ((el.firstElementChild?.getBoundingClientRect().width ?? 330) + 20),
        ),
      );
      setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [screen, visible]);
  useEffect(() => {
    surface.current
      ?.querySelector<HTMLElement>("h2")
      ?.focus({ preventScroll: true });
  }, [screen]);
  async function searchCars(overrides: Partial<CarSearchInput> = {}) {
    if (!ready || inFlight.current) return;
    if (
      !carDate(start) ||
      !carDate(end) ||
      end <= start ||
      (Date.parse(end) - Date.parse(start)) / 86400000 > 30
    ) {
      setNotice("Choose a return 1 to 30 days after pickup.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setSearchState("loading");
    setScreen("browse");
    setNotice("");
    const request = ++requestSeq.current;
    try {
      const response = await search.callToolAsync({
        ...data.searchContext,
        startDate: start,
        endDate: end,
        pickup,
        ...overrides,
      });
      if (request !== requestSeq.current) return;
      if (response.isError || !isCarSearch(response.structuredContent))
        throw new Error("Search unavailable");
      const next = response.structuredContent;
      setData(next);
      setSelected(next.selected);
      setComparison([]);
      setShowEditor(false);
      setExtra(false);
      setFilter(filters[filterIds.indexOf(next.searchContext.filter)]!);
      setSearchState(
        next.status === "success"
          ? "ready"
          : next.status === "empty"
            ? "empty"
            : "error",
      );
      setScreen(
        next.cars.length === 1 && next.searchContext.carName
          ? "detail"
          : "browse",
      );
      setFocusId(next.cars[0]?.key);
      setNotice(next.message);
    } catch {
      if (request === requestSeq.current) {
        setSearchState("error");
        setScreen("browse");
        setNotice(
          "The search could not be checked. Your selected trip is unchanged.",
        );
      }
    } finally {
      inFlight.current = false;
      if (request === requestSeq.current) setBusy(false);
    }
  }
  async function addCar(car: Car) {
    if (!ready || inFlight.current || !data.canSelect) return;
    inFlight.current = true;
    setBusy(true);
    setNotice("");
    const request = ++requestSeq.current;
    try {
      const response = await select.callToolAsync({
        action: "select",
        carRef: car.carRef,
        pickup,
        secondDriver: extra,
        expectedSelectionId: selected?.selectionId ?? "",
      });
      if (request !== requestSeq.current) return;
      const value = response.structuredContent as
        | Record<string, unknown>
        | undefined;
      if (
        response.isError ||
        !["selected", "already_selected"].includes(String(value?.status)) ||
        !isCarSelection(value?.selection)
      ) {
        setNotice(
          typeof value?.message === "string"
            ? value.message
            : "Saving was not confirmed. Search again before choosing.",
        );
        return;
      }
      setSelected(value.selection);
      setScreen("added");
      if (layout.supports?.modelContext) {
        try {
          const current = await review.callToolAsync({});
          if (request !== requestSeq.current) return;
          if (
            current.isError ||
            !isTripPlanningReview(current.structuredContent)
          )
            throw new Error("Review unavailable");
          await updateContext({
            content: [
              { type: "text", text: current.structuredContent.fallback },
            ],
            structuredContent: {
              tripPlanning: tripPlanningSnapshot(current.structuredContent),
            },
          });
        } catch {
          if (request === requestSeq.current)
            setNotice(
              "Your car was saved. Open Review my trip to refresh the conversation context.",
            );
        }
      }
    } catch {
      if (request === requestSeq.current)
        setNotice(
          "Saving could not be confirmed. Review your trip before trying again.",
        );
    } finally {
      inFlight.current = false;
      if (request === requestSeq.current) setBusy(false);
    }
  }
  if (screen === "trip")
    return (
      <InlineTripReview
        onBack={() => {
          void searchCars();
        }}
        backLabel="Back to cars"
      />
    );
  function back(label = "Back to cars", target: Screen = "browse") {
    return (
      <button
        type="button"
        className="back"
        onClick={() => {
          setScreen(target);
          setNotice("");
        }}
        disabled={busy || !ready}
      >
        <ArrowLeftIcon />
        {label}
      </button>
    );
  }
  function disclaimer(extraText = "") {
    return (
      <p className="disclosure">
        <InformationCircleIcon />
        Fictional fleet, prices and rental terms. Nothing is reserved.{" "}
        {extraText}
        <button
          type="button"
          className="text-link"
          onClick={() => setShowCredits(true)}
        >
          Photo sources
        </button>
      </p>
    );
  }
  function summary() {
    return (
      <div className="rental-summary">
        <div>
          <MapPinIcon />
          <span>
            <small>Pickup & return</small>
            <strong>{pickupLabel}</strong>
          </span>
        </div>
        <div>
          <CalendarDaysIcon />
          <span>
            <small>{days}-day rental</small>
            <strong>{dateRange} · 12:00</strong>
          </span>
        </div>
        <div>
          <UsersIcon />
          <span>
            <small>From your demo trip</small>
            <strong>
              {data.searchContext.adults}{" "}
              {data.searchContext.adults === 1 ? "adult" : "adults"} · 1 driver
            </strong>
          </span>
        </div>
        <button
          type="button"
          className="pill secondary edit-search"
          onClick={() => setShowEditor(!showEditor)}
          aria-expanded={showEditor}
        >
          <AdjustmentsHorizontalIcon />
          <span>Edit</span>
        </button>
      </div>
    );
  }
  function editSearch() {
    return showEditor ? (
      <Form className="edit-panel" onSubmit={() => void searchCars()}>
        <div>
          <label htmlFor="pickup-date">Pickup date</label>
          <input
            id="pickup-date"
            type="date"
            required
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (e.target.value >= end)
                setEnd(
                  new Date(Date.parse(e.target.value) + 86400000)
                    .toISOString()
                    .slice(0, 10),
                );
            }}
          />
        </div>
        <div>
          <label htmlFor="return-date">Return date</label>
          <input
            id="return-date"
            type="date"
            required
            min={new Date(Date.parse(start) + 86400000)
              .toISOString()
              .slice(0, 10)}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <div className="pickup-toggle">
          <span>Start the drive from</span>
          <div>
            <button
              type="button"
              className="pill secondary"
              aria-pressed={pickup === "airport"}
              onClick={() => setPickup("airport")}
            >
              Airport
            </button>
            <button
              type="button"
              className="pill secondary"
              aria-pressed={pickup === "hotel"}
              onClick={() => setPickup("hotel")}
            >
              My stay
            </button>
          </div>
        </div>
        <button className="pill primary" type="submit">
          Use these dates
          <CheckIcon />
        </button>
        <p>
          12:00 is a browsing assumption, not a confirmed flight arrival or
          pickup appointment.
        </p>
      </Form>
    ) : null;
  }
  function carCard(car: Car) {
    const compared = comparison.includes(car.id);
    return (
      <article className="car-card" key={car.id}>
        <div className="card-media">
          <Photo car={car} />
          <span className="media-label">
            {car.xiaomi ? "Xiaomi collection" : car.energy}
          </span>
          {cars.length > 1 && (
            <button
              type="button"
              className={"compare-chip " + (compared ? "active" : "")}
              aria-label={`${compared ? "Remove" : "Compare"} ${car.name}${compared ? " from comparison" : ""}`}
              aria-pressed={compared}
              onClick={() => toggleCompare(car.id)}
            >
              {compared ? <CheckIcon /> : <PlusIcon />}
              <span>Compare</span>
            </button>
          )}
        </div>
        <div className="car-body">
          <p className="eyebrow">{car.kind}</p>
          <h3>{car.name}</h3>
          <p className="car-line">{car.line}</p>
          <div className="specs">
            <span>
              <UsersIcon />
              {car.seats} seats
            </span>
            <span>
              <BriefcaseIcon />
              {car.bags} bags
            </span>
            <span>
              {car.energy === "Electric" ? (
                <BoltIcon />
              ) : (
                <ArrowsRightLeftIcon />
              )}
              {car.energy}
            </span>
          </div>
          <div className="pickup-line">
            <MapPinIcon />
            <span>
              {pickupLabel}
              <small>
                {car.xiaomi
                  ? "Concept fleet · not verified locally"
                  : "Sample pickup · same-location return"}
              </small>
            </span>
          </div>
          <div className="car-price">
            <div>
              <strong>{euro(total(car))}</strong>
              <span> / {days} days</span>
              <small>{euro(car.price)}/day + sample fees</small>
            </div>
            <span className="quiet-label">Demo price</span>
          </div>
          <button
            type="button"
            className="pill primary card-action"
            onClick={() => viewCar(car)}
            aria-label={"View " + car.name}
          >
            View car
            <ArrowRightIcon />
          </button>
        </div>
      </article>
    );
  }
  function comparisonTray() {
    return (
      <div className="comparison-tray">
        <div className="comparison-picks">
          {comparisonCars.length ? (
            comparisonCars.map((car) => (
              <div className="mini-car" key={car.id}>
                <Photo car={car} />
                <div>
                  <strong>{car.name}</strong>
                  <small>
                    {euro(total(car))} · {days} days
                  </small>
                </div>
                <button
                  type="button"
                  className="icon-button remove"
                  aria-label={"Remove " + car.name + " from comparison"}
                  onClick={() => toggleCompare(car.id)}
                >
                  <XMarkIcon />
                </button>
              </div>
            ))
          ) : (
            <p>
              <ArrowsRightLeftIcon />
              Two possibilities. One easier decision.
              <small>Select two cars to compare the details that matter.</small>
            </p>
          )}
        </div>
        {comparison.length > 0 && (
          <button
            type="button"
            className="pill secondary compare-selected"
            disabled={comparison.length !== 2}
            onClick={() => setScreen("compare")}
          >
            Compare {comparison.length === 2 ? "selected" : "2 cars"}
            <ArrowRightIcon />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="wf-cars" data-theme={layout.theme} data-llm={data.fallback}>
      {onBack && (
        <div className="screen-top">
          <button
            type="button"
            className="back"
            onClick={onBack}
            disabled={busy}
          >
            <ArrowLeftIcon />
            Back to your trip
          </button>
        </div>
      )}
      <div className="experience-surface" ref={surface}>
        {screen === "browse" && (
          <section
            className="browser-panel"
            aria-label="Car rental discovery"
            aria-busy={searchState === "loading"}
          >
            <div className="browse-heading">
              <div>
                <p className="eyebrow accent">
                  Your trip, with a little more freedom
                </p>
                <h2 tabIndex={-1}>Find your kind of drive.</h2>
                <p>A city break. A coastal detour. The keys are up to you.</p>
              </div>
              <span className="demo-badge">Wayfare concept</span>
            </div>
            {summary()}
            <div className="browse-assumptions">
              {data.assumptions.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
            {editSearch()}
            <div className="fleet-toolbar">
              <div className="filter-list" aria-label="Filter cars">
                {filters.map((f) => (
                  <button
                    type="button"
                    className="pill filter"
                    key={f}
                    aria-pressed={filter === f}
                    onClick={() => chooseFilter(f)}
                  >
                    {filter === f && <CheckIcon />}
                    {f}
                  </button>
                ))}
              </div>
              <span className="fleet-count">
                {searchState === "loading"
                  ? "Finding cars"
                  : visible.length + " car" + (visible.length === 1 ? "" : "s")}
              </span>
            </div>
            {searchState === "error" ? (
              <div className="empty-state">
                <ExclamationTriangleIcon />
                <h3>The cars took a wrong turn.</h3>
                <p>
                  The search could not finish. Your selected trip has not been
                  changed.
                </p>
                <button
                  type="button"
                  className="pill primary"
                  onClick={() => void searchCars()}
                >
                  Try this search again
                  <ArrowPathIcon />
                </button>
              </div>
            ) : searchState === "loading" ? (
              <div className="skeleton-track" aria-label="Loading car results">
                {[0, 1, 2].map((n) => (
                  <div className="skeleton-car" key={n}>
                    <div />
                    <span />
                    <span />
                    <span />
                    <b />
                  </div>
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="empty-state">
                <TruckIcon />
                <h3>A little too specific, this time.</h3>
                <p>
                  No demo cars match these filters. Keep your dates and open up
                  the lineup.
                </p>
                <button
                  type="button"
                  className="pill primary"
                  onClick={() => {
                    void searchCars({ carName: "", filter: "all" });
                  }}
                >
                  Show all {cars.length} cars
                  <ArrowRightIcon />
                </button>
              </div>
            ) : (
              <>
                <div className="carousel-wrap">
                  <div
                    className="car-track"
                    ref={track}
                    role="region"
                    aria-label="Available concept cars, swipe or use arrows"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        e.preventDefault();
                        scrollCars(e.key === "ArrowRight" ? 1 : -1);
                      }
                    }}
                  >
                    {visible.map(carCard)}
                  </div>
                  <button
                    type="button"
                    className="icon-button carousel-arrow prev"
                    aria-label="Previous cars"
                    disabled={position === 0}
                    onClick={() => scrollCars(-1)}
                  >
                    <ChevronLeftIcon />
                  </button>
                  <button
                    type="button"
                    className="icon-button carousel-arrow next"
                    aria-label="Next cars"
                    disabled={!canNext}
                    onClick={() => scrollCars(1)}
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
                <div className="carousel-footer">
                  <span>{visible.length} cars, one trip.</span>
                  <div className="position-pips" aria-hidden="true">
                    {visible.map((car, i) => (
                      <span
                        key={car.id}
                        className={position === i ? "current" : ""}
                      />
                    ))}
                  </div>
                  <span>
                    Swipe to explore
                    <ArrowRightIcon />
                  </span>
                </div>
                {cars.length > 1 && comparisonTray()}
              </>
            )}
            {notice && (
              <p className="inline-notice" role="status">
                {notice}
              </p>
            )}
            {disclaimer(
              "Xiaomi cars are a concept showcase, not verified local rentals. ",
            )}
          </section>
        )}
        {screen === "detail" && focused && (
          <section className="detail-panel">
            <div className="screen-top">
              {back()}
              <span className="demo-badge">Car details · demo</span>
            </div>
            <CarGallery key={focused.id} car={focused} />
            <div className="detail-heading">
              <div>
                <p className="eyebrow accent">
                  {focused.kind} · {focused.energy}
                </p>
                <h2 tabIndex={-1}>{focused.name}</h2>
                <p>{focused.note}</p>
              </div>
              <div className="detail-price">
                <strong>{euro(total(focused))}</strong>
                <span>for {days} days · demo price</span>
              </div>
            </div>
            <div className="detail-content">
              <div className="detail-facts">
                <div className="detail-specs">
                  <div>
                    <UsersIcon />
                    <strong>{focused.seats} seats</strong>
                    <span>Sample configuration</span>
                  </div>
                  <div>
                    <BriefcaseIcon />
                    <strong>{focused.bags} bags</strong>
                    <span>Illustrative capacity</span>
                  </div>
                  <div>
                    <ArrowsRightLeftIcon />
                    <strong>Automatic</strong>
                    <span>Sample configuration</span>
                  </div>
                  <div>
                    <BoltIcon />
                    <strong>{focused.energy}</strong>
                    <span>Model powertrain</span>
                  </div>
                </div>
                <section className="pickup-plan">
                  <div className="section-heading">
                    <h3>Fits the trip you are planning.</h3>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setShowEditor(!showEditor)}
                    >
                      Edit pickup
                    </button>
                  </div>
                  <div className="pickup-steps">
                    <div>
                      <span className="step-circle">
                        <MapPinIcon />
                      </span>
                      <div>
                        <small>
                          Pick up · {dayLabel(data.searchContext.startDate)},
                          12:00
                        </small>
                        <strong>{pickupLabel}</strong>
                        <p>
                          {pickup === "airport"
                            ? "Airport collection is a preview assumption. Counter and shuttle details are unverified."
                            : "Hotel collection is a demo option. Delivery service has not been verified."}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="step-circle">
                        <KeyIcon />
                      </span>
                      <div>
                        <small>
                          Return · {dayLabel(data.searchContext.endDate)}, 12:00
                        </small>
                        <strong>Back to the same place</strong>
                        <p>
                          A {days}-day window, kept separate from your flight
                          and hotel dates.
                        </p>
                      </div>
                    </div>
                  </div>
                  {editSearch()}
                </section>
                <details className="terms">
                  <summary>
                    What to know before you choose
                    <ChevronDownIcon />
                  </summary>
                  <div>
                    <p>
                      <strong>All terms are examples.</strong> No rental
                      provider, driver eligibility, model guarantee or
                      availability has been checked.
                    </p>
                    <p>
                      Sample mileage: 600 km for this rental. Sample
                      cancellation: free until 48 hours before pickup. A real
                      offer may differ.
                    </p>
                    <p>
                      Driving licence, minimum age, deposit rules, local road
                      restrictions, and{" "}
                      {focused.energy === "Electric"
                        ? "charging connector compatibility"
                        : "fuel policy"}{" "}
                      would need provider confirmation before booking.
                    </p>
                    <p>
                      Trip protection is separate from rental damage or
                      liability coverage. No protection is included or purchased
                      here.
                    </p>
                  </div>
                </details>
              </div>
              <aside className="price-sheet">
                <p className="eyebrow">No surprises in the arithmetic</p>
                <h3>Your rental, broken down.</h3>
                <dl>
                  <div>
                    <dt>
                      {days} days × {euro(focused.price)}
                    </dt>
                    <dd>{euro(focused.price * days)}</dd>
                  </div>
                  <div>
                    <dt>
                      {pickup === "airport"
                        ? "Sample airport fee"
                        : "Sample hotel delivery"}
                    </dt>
                    <dd>{euro(pickupFee)}</dd>
                  </div>
                  {extra && (
                    <div>
                      <dt>Second driver · {days} days</dt>
                      <dd>{euro(days * data.fees.driverPerDay)}</dd>
                    </div>
                  )}
                </dl>
                <label className="extra-option">
                  <input
                    type="checkbox"
                    checked={extra}
                    onChange={(e) => setExtra(e.target.checked)}
                  />
                  <span>
                    Add a second driver
                    <small>
                      Fictional extra · {euro(data.fees.driverPerDay)} per day
                    </small>
                  </span>
                </label>
                <div className="sheet-total">
                  <span>Car estimate</span>
                  <strong>{euro(total(focused))}</strong>
                </div>
                <p className="deposit-note">
                  Sample deposit: {euro(focused.deposit.amount)}, separate from
                  this estimate. Refund conditions unverified. Other fees
                  unknown.
                </p>
                {selected && selected.car.key !== focused.id && (
                  <p className="replace-note">
                    This replaces your {selected.car.name}, not a second rental.
                  </p>
                )}
                <button
                  type="button"
                  className="pill primary"
                  disabled={busy || !ready || !data.canSelect}
                  onClick={() => addCar(focused)}
                >
                  {busy ? (
                    <>
                      <ArrowPathIcon className="spin" />
                      Adding to your trip…
                    </>
                  ) : (
                    <>
                      <PlusIcon />
                      {selected
                        ? "Update car in my trip"
                        : "Add car to my trip"}
                    </>
                  )}
                </button>
                <p className="tiny-center">
                  A planning choice. Not a reservation.
                </p>
              </aside>
            </div>
            {disclaimer()}
          </section>
        )}
        {screen === "compare" && (
          <section className="compare-panel">
            <div className="screen-top">
              {back()}
              <span className="demo-badge">Side by side</span>
            </div>
            <div className="section-title">
              <p className="eyebrow accent">
                The things that make a difference
              </p>
              <h2 tabIndex={-1}>Which drive feels like you?</h2>
              <p>Same dates. Same pickup. Two different ways to go.</p>
            </div>
            <div className="comparison-grid">
              {comparisonCars.map((car) => (
                <article className="compare-column" key={car.id}>
                  <Photo car={car} />
                  <div className="compare-column-body">
                    <p className="eyebrow">{car.kind}</p>
                    <h3>{car.name}</h3>
                    <p>{car.line}</p>
                    <dl>
                      <div>
                        <dt>Your {days}-day estimate</dt>
                        <dd className="big-price">{euro(total(car))}</dd>
                      </div>
                      <div>
                        <dt>Powertrain</dt>
                        <dd>{car.energy}</dd>
                      </div>
                      <div>
                        <dt>Example configuration</dt>
                        <dd>
                          {car.seats} seats · {car.bags} bags
                        </dd>
                      </div>
                      <div>
                        <dt>Pickup & return</dt>
                        <dd>{pickupLabel}</dd>
                      </div>
                      <div>
                        <dt>Sample deposit, separate</dt>
                        <dd>{euro(car.deposit.amount)}</dd>
                      </div>
                      <div>
                        <dt>Example mileage</dt>
                        <dd>600 km / rental</dd>
                      </div>
                      <div>
                        <dt>Example cancellation</dt>
                        <dd>Until 48 hours before</dd>
                      </div>
                      <div>
                        <dt>Local availability</dt>
                        <dd>Not verified</dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      className="pill primary"
                      onClick={() => viewCar(car)}
                    >
                      Explore this car
                      <ArrowRightIcon />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {comparisonCars.length === 2 && (
              <p className="comparison-insight">
                <InformationCircleIcon />
                {euro(
                  Math.abs(total(comparisonCars[0]) - total(comparisonCars[1])),
                )}{" "}
                difference over this sample rental. Compare the whole rental,
                not just the daily price.
              </p>
            )}
            {disclaimer()}
          </section>
        )}
        {screen === "added" && selected && (
          <section className="added-panel">
            <div className="screen-top">
              {back("Back to car details", "detail")}
              <span className="demo-badge">Saved in this conversation</span>
            </div>
            <div className="added-heading">
              <span className="selected-check">
                <CheckIcon />
              </span>
              <p className="eyebrow">Car added to your demo trip</p>
              <h2 tabIndex={-1}>
                Your {selected.searchContext.destination} plan has wheels.
              </h2>
              <p>
                The {selected.car.name} is now part of your plan.
                <br />
                No keys collected, no card charged, nothing reserved.
              </p>
            </div>
            <div className="added-car">
              <Photo car={asCar(selected.car)} />
              <div>
                <p className="eyebrow">Selected · car rental</p>
                <h3>{selected.car.name}</h3>
                <p>
                  {dayLabel(selected.searchContext.startDate)}–
                  {dayLabel(selected.searchContext.endDate)} ·{" "}
                  {selected.pickup === "airport"
                    ? selected.searchContext.destination + " Airport"
                    : "Your " + selected.searchContext.destination + " stay"}
                </p>
                <strong>
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: selected.totalPrice.currency,
                  }).format(selected.totalPrice.amount)}{" "}
                  <small>fictional rental estimate</small>
                </strong>
              </div>
            </div>
            <div className="added-actions">
              <button
                type="button"
                className="pill primary"
                data-trip-review-trigger
                onClick={() => (onReview ? onReview() : setScreen("trip"))}
              >
                Review my trip
                <ArrowRightIcon />
              </button>
              <button
                type="button"
                className="pill secondary"
                onClick={() => browse("All cars")}
              >
                Keep exploring cars
              </button>
            </div>
            <p className="added-note">
              <CheckIcon />
              Your other trip choices are unchanged.
            </p>
          </section>
        )}
      </div>
      {screen !== "browse" && notice && (
        <p className="inline-notice" role="status">
          {notice}
        </p>
      )}
      {showCredits && (
        <section className="car-sources" aria-label="Photo sources">
          <div className="screen-top">
            <h2>Behind the drive</h2>
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowCredits(false)}
              aria-label="Close photo sources"
            >
              <XMarkIcon />
            </button>
          </div>
          <p>
            Fictional rental concepts, not provider inventory. Model photos are
            source photographs displayed with layout cropping; colours and
            specifications may vary. No rental is booked.
          </p>
          <ul>
            {Object.entries(carPhotos).map(([key, credit]) => (
              <li key={key}>
                <strong>
                  {key} · {credit.author}
                </strong>
                <span>{credit.license}</span>
                <button
                  type="button"
                  className="text-link"
                  disabled={!ready}
                  onClick={() => void openExternal(credit.source)}
                >
                  Original photo
                </button>
                <button
                  type="button"
                  className="text-link"
                  disabled={!ready}
                  onClick={() => void openExternal(credit.licenseUrl)}
                >
                  License
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
export function CarLoading() {
  return (
    <div className="wf-cars">
      <section className="browser-panel" role="status" aria-busy="true">
        <div className="browse-heading">
          <div>
            <p className="eyebrow accent">
              Your trip, with a little more freedom
            </p>
            <h2>Finding your kind of drive…</h2>
          </div>
        </div>
        <div className="skeleton-track">
          {[0, 1, 2].map((n) => (
            <div className="skeleton-car" key={n}>
              <div />
              <span />
              <span />
              <span />
              <b />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
export function TripCarDiscovery({
  input,
  onBack,
}: {
  readonly input: CarSearchInput;
  readonly onBack: () => void;
}) {
  const ready = useWidgetReady(),
    search = useCallTool("search_cars"),
    call = useRef(search.callToolAsync);
  call.current = search.callToolAsync;
  const [data, setData] = useState<CarSearchResult>(),
    [error, setError] = useState(false),
    [attempt, retry] = useState(0);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setData(undefined);
    setError(false);
    void call
      .current(input)
      .then((response) => {
        if (!active) return;
        if (response.isError || !isCarSearch(response.structuredContent))
          setError(true);
        else setData(response.structuredContent);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [ready, JSON.stringify(input), attempt]);
  return data ? (
    <CarJourney
      key={data.searchId}
      data={data}
      onBack={onBack}
      onReview={onBack}
    />
  ) : error ? (
    <div className="wf-cars">
      <div className="empty-state">
        <h2>Cars could not load.</h2>
        <p>Your trip choices are unchanged.</p>
        <button
          type="button"
          className="pill primary"
          onClick={() => retry((v) => v + 1)}
        >
          Try again
        </button>
        <button type="button" className="back" onClick={onBack}>
          Back to your trip
        </button>
      </div>
    </div>
  ) : (
    <CarLoading />
  );
}
export default function CarResults() {
  const ready = useWidgetReady(),
    info = useToolInfo("search_cars");
  if (!ready || !Object.keys(info).length) return <CarLoading />;
  return !info.isError && isCarSearch(info.structuredContent) ? (
    <CarJourney
      key={info.structuredContent.searchId}
      data={info.structuredContent}
    />
  ) : (
    <div className="wf-cars">
      <div className="empty-state">
        <h2>Cars could not load.</h2>
        <p>
          The result was incomplete. Ask to search cars again; no car was
          selected.
        </p>
      </div>
    </div>
  );
}
