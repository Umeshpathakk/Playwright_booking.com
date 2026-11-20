import { test, expect } from '@playwright/test';
import { FlightsSearchPage } from '../pages/FlightsSearchPage';
import { addDays, shortDayMonth, toISODate } from '../utils/dates';

/**
 * Case 1 – Searching flights based on flight routes (Booking.com)
 *
 * a) DEL → BOM for today and tomorrow; assert selected dates on results
 * b) Additional automated checks (one-way, URL params, filters)
 */

const DEL_OPTION = /DEL|Delhi International|New Delhi/i;
const BOM_OPTION = /BOM.*Mumbai All airports|Mumbai All airports/i;

async function searchDelToBom(page: import('@playwright/test').Page, depart: Date) {
  const flights = new FlightsSearchPage(page);
  await flights.open();
  await flights.selectOneWay();
  await flights.ensureOrigin('DEL', DEL_OPTION);
  await flights.setDestination('BOM', BOM_OPTION);
  await flights.selectDepartureDate(depart);
  await flights.expectSelectedTravelDate(depart);
  await flights.search();
  await flights.waitForResults();
  return flights;
}

test.describe('Booking.com – Flight route search (DEL → BOM)', () => {
  test('a1) DEL → BOM for today shows flights with the selected date @smoke', async ({ page }) => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const flights = await searchDelToBom(page, today);

    await flights.expectRouteInUrl('DEL', 'BOM', today);
    await flights.expectSelectedTravelDate(today);
    await flights.expectResultsShowSelectedDate(today);
    await expect(page).toHaveURL(/type=ONEWAY/);
  });

  test('a2) DEL → BOM for tomorrow shows flights with the selected date @smoke', async ({ page }) => {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(12, 0, 0, 0);

    const flights = await searchDelToBom(page, tomorrow);

    await flights.expectRouteInUrl('DEL', 'BOM', tomorrow);
    await flights.expectSelectedTravelDate(tomorrow);
    await flights.expectResultsShowSelectedDate(tomorrow);
    await expect(
      page.getByText(new RegExp(`DEL\\s*·\\s*${shortDayMonth(tomorrow)}`, 'i')).first(),
    ).toBeVisible();
  });

  test('b1) Search form keeps DEL origin and Mumbai destination after selection', async ({
    page,
  }) => {
    const flights = new FlightsSearchPage(page);

    await flights.open();
    await flights.selectOneWay();
    await flights.ensureOrigin('DEL', DEL_OPTION);
    await flights.setDestination('BOM', BOM_OPTION);

    await flights.expectOriginAndDestinationSelected('DEL', /Mumbai/i);
    await expect(flights.oneWayRadio).toBeChecked();
  });

  test('b2) Results URL encodes depart date and one-way trip type', async ({ page }) => {
    const depart = addDays(new Date(), 2);
    depart.setHours(12, 0, 0, 0);

    await searchDelToBom(page, depart);

    expect(page.url()).toContain(`depart=${toISODate(depart)}`);
    expect(page.url()).toMatch(/type=ONEWAY/i);
    expect(page.url()).toMatch(/from=DEL/i);
    expect(page.url()).toMatch(/to=BOM/i);
  });

  test('b3) Direct flights filter is available on search results', async ({ page }) => {
    const depart = addDays(new Date(), 3);
    depart.setHours(12, 0, 0, 0);

    await searchDelToBom(page, depart);

    await expect(page.getByText(/Direct only|Direct flights/i).first()).toBeVisible();
    await expect(page.getByText(/Stops/i).first()).toBeVisible();
  });
});
