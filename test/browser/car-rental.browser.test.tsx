import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { CarJourney, CarLoading } from "../../src/views/car-results.js";
import { CAR_CATALOG } from "../../src/car-fixtures.js";
import { runCarGateway } from "../../src/car-runtime.js";
import type { CarSearchResult, CarState } from "../../src/car-schemas.js";
import { carPhotos } from "../../src/views/car-photos.js";

const mocks = vi.hoisted(() => ({
  call: vi.fn(),
  context: vi.fn().mockResolvedValue(undefined),
  ready: true,
}));
vi.mock("../../src/helpers.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/helpers.js")>()),
  useWidgetReady: () => mocks.ready,
  useLayout: () => ({
    locale: "en-GB",
    theme: "light",
    supports: { modelContext: false },
  }),
  useCallTool: (tool: string) => ({
    callToolAsync: (input: unknown) => mocks.call(tool, input),
  }),
  useUpdateModelContext: () => mocks.context,
}));
const now = "2026-09-10T12:00:00Z";
const search = {
  destination: "Lisbon",
  startDate: "2026-09-18",
  endDate: "2026-09-21",
  adults: 2,
  currency: "EUR",
  pickup: "airport",
  carName: "",
  filter: "all",
};
function fixture(name = "") {
  const found = runCarGateway({
    kind: "search",
    search: { ...search, carName: name },
    catalog: CAR_CATALOG,
    requestedAt: now,
    readOk: true,
    state: {},
  });
  return {
    data: { ...found.result!, canSelect: true },
    state: found.nextState!,
  };
}
let root: Root | undefined;
afterEach(() => {
  root?.unmount();
  root = undefined;
  document.body.innerHTML = "";
  document.body.style.zoom = "";
  mocks.call.mockReset();
  mocks.ready = true;
});
function mount(data: CarSearchResult) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  root.render(<CarJourney data={data} />);
}
it("keeps the approved 15-car carousel, gallery and two-card comparison geometry at desktop and mobile", async () => {
  await page.viewport(1160, 1300);
  mount(fixture().data);
  await expect
    .element(page.getByRole("heading", { name: "Find your kind of drive." }))
    .toBeVisible();
  expect(document.querySelectorAll(".car-card")).toHaveLength(15);
  expect(Object.keys(carPhotos)).toHaveLength(45);
  expect(new Set(Object.values(carPhotos).map((v) => v.image)).size).toBe(45);
  const next = page.getByRole("button", { name: "Next cars", exact: true });
  await expect.element(next).toBeEnabled();
  await next.click();
  await expect
    .poll(() => document.querySelector(".car-track")!.scrollLeft)
    .toBeGreaterThan(0);
  document.querySelector(".car-track")!.scrollTo({ left: 0 });
  await page
    .getByRole("button", { name: "Compare Xiaomi SU7", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Compare Xiaomi YU7", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Compare selected", exact: false })
    .click();
  await expect
    .element(page.getByRole("heading", { name: "Which drive feels like you?" }))
    .toBeVisible();
  await page.getByRole("button", { name: "Back to cars", exact: true }).click();
  await page
    .getByRole("button", { name: "View Xiaomi SU7", exact: true })
    .click();
  await expect
    .element(page.getByRole("heading", { name: "Xiaomi SU7", exact: true }))
    .toBeVisible();
  const first =
    document.querySelector<HTMLImageElement>(".detail-photo img")!.src;
  await page
    .getByRole("button", { name: "Next car photo", exact: true })
    .click();
  expect(
    document.querySelector<HTMLImageElement>(".detail-photo img")!.src,
  ).not.toBe(first);
  await page.getByRole("button", { name: "Show car photo 3" }).click();
  await expect
    .element(page.getByRole("button", { name: "Show car photo 3" }))
    .toHaveAttribute("aria-pressed", "true");
  for (const [width, zoom] of [
    [1160, 1],
    [390, 1],
    [320, 1],
    [640, 2],
  ] as const) {
    await page.viewport(width, 1300);
    document.body.style.zoom = String(zoom);
    await expect
      .poll(() => document.documentElement.scrollWidth)
      .toBeLessThanOrEqual(width);
    expect(
      document.querySelector(".detail-photo")!.getBoundingClientRect().height /
        zoom,
    ).toBeGreaterThanOrEqual(190);
    await page.screenshot({
      path: `__screenshots__/cars-details-${width}-${zoom}.png`,
      fullPage: true,
    });
  }
});
it("opens a uniquely named car, hides comparison for one result and waits for persistence before acknowledging", async () => {
  await page.viewport(1000, 1200);
  const { data, state } = fixture("Honda Civic");
  mount(data);
  await expect
    .element(
      page.getByRole("heading", { name: "Honda Civic Sport Touring Hybrid" }),
    )
    .toBeVisible();
  let resolve!: (value: unknown) => void;
  mocks.call.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await page
    .getByRole("checkbox", { name: "Add a second driver", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Add car to my trip", exact: false })
    .click();
  await expect
    .element(
      page.getByRole("button", { name: "Adding to your trip", exact: false }),
    )
    .toBeDisabled();
  expect(document.querySelector(".added-panel")).toBeNull();
  const [tool, input] = mocks.call.mock.calls[0]!;
  expect(tool).toBe("select_car");
  expect(input).not.toHaveProperty("price");
  const proposed = runCarGateway({
    kind: "select",
    action: input,
    state,
    readOk: true,
    requestedAt: now,
  });
  resolve({ structuredContent: proposed.decision });
  await expect
    .element(
      page.getByRole("heading", { name: "Your Lisbon plan has wheels." }),
    )
    .toBeVisible();
  expect(document.querySelector(".added-panel")!.textContent).toContain(
    "€228.00",
  );
  await page.getByRole("button", { name: "Keep exploring cars" }).click();
  expect(document.querySelector(".compare-chip")).toBeNull();
  expect(document.querySelector(".comparison-tray")).toBeNull();
});
it("does not acknowledge a failed save and gates add until bridge and snapshot are ready", async () => {
  await page.viewport(1000, 1200);
  const { data } = fixture("Toyota Crown Signia");
  mocks.ready = false;
  mount(data);
  await expect
    .element(
      page.getByRole("button", { name: "Add car to my trip", exact: false }),
    )
    .toBeDisabled();
  mocks.ready = true;
  root!.render(<CarJourney data={data} />);
  mocks.call.mockResolvedValue({
    structuredContent: {
      status: "conflict",
      message: "Your trip changed. Search again.",
    },
  });
  await page
    .getByRole("button", { name: "Add car to my trip", exact: false })
    .click();
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Your trip changed. Search again.");
  expect(document.querySelector(".added-panel")).toBeNull();
});
