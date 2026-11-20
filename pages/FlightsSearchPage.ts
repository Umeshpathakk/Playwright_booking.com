import { expect, Locator, Page } from '@playwright/test';
import { departureAriaLabel, shortDayMonth, toISODate } from '../utils/dates';

export class FlightsSearchPage {
  readonly page: Page;
  readonly oneWayRadio: Locator;
  readonly originButton: Locator;
  readonly destinationButton: Locator;
  readonly travelDateButton: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.oneWayRadio = page.getByRole('radio', { name: 'One way' });
    this.originButton = page.getByRole('button', { name: /Leaving from/i });
    this.destinationButton = page.getByRole('button', { name: /Going to/i });
    this.travelDateButton = page.getByRole('button', { name: /Travel date/i });
    this.searchButton = page.getByRole('button', { name: /^(Search|Explore)$/i });
  }

  async open(): Promise<void> {
    await this.page.goto('/flights/index.en-gb.html', { waitUntil: 'domcontentloaded' });
    await this.dismissCookieBanner();
    await expect(this.page.getByRole('heading', { name: /cheap flights/i })).toBeVisible();
    // Wait for search widget to hydrate (geo-based origin often appears shortly after load).
    await expect(this.originButton).toBeVisible();
    await this.page.waitForTimeout(1_000);
  }

  async dismissCookieBanner(): Promise<void> {
    const accept = this.page.getByRole('button', {
      name: /Accept|Agree|OK|Got it|I agree|Accept all/i,
    });
    try {
      await accept.first().click({ timeout: 3_000 });
    } catch {
      // No banner in this session/region.
    }
  }

  async closeOverlays(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(200);
  }

  async selectOneWay(): Promise<void> {
    await this.closeOverlays();
    // Click the visible label; radio alone can be covered by custom UI.
    await this.page.getByText('One way', { exact: true }).first().click();
    await expect(this.oneWayRadio).toBeChecked({ timeout: 10_000 });
  }

  /** Keep DEL if already selected; otherwise pick it from suggestions. */
  async ensureOrigin(airportCode: string, optionName: RegExp): Promise<void> {
    await this.closeOverlays();

    // Geo IP often pre-fills DEL — wait briefly before deciding to re-select.
    const alreadySet = this.page.getByRole('button', {
      name: new RegExp(`Leaving from.*${airportCode}`, 'i'),
    });
    try {
      await alreadySet.waitFor({ state: 'visible', timeout: 5_000 });
      return;
    } catch {
      // Origin not pre-filled; select manually below.
    }

    await this.originButton.click();
    const field = this.page.getByRole('combobox', {
      name: /Departure airport or city|Where from|Airport, city or country/i,
    });
    await field.waitFor({ state: 'visible', timeout: 10_000 });
    await field.fill('');
    await field.pressSequentially(airportCode, { delay: 80 });
    await this.page.getByRole('option', { name: optionName }).first().click({ timeout: 15_000 });
    await expect(
      this.page.getByRole('button', { name: new RegExp(`Leaving from.*${airportCode}`, 'i') }),
    ).toBeVisible();
  }

  async setDestination(airportCode: string, optionName: RegExp): Promise<void> {
    await this.closeOverlays();
    await this.destinationButton.click();

    const labelled = this.page.getByRole('combobox', {
      name: /Arrival airport or city/i,
    });
    await labelled.waitFor({ state: 'visible', timeout: 10_000 });
    await labelled.fill('');
    await labelled.pressSequentially(airportCode, { delay: 80 });

    const option = this.page.getByRole('option', { name: optionName }).first();
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();

    await expect(this.destinationButton).toContainText(/Mumbai|BOM/i);
  }

  async selectDepartureDate(date: Date): Promise<void> {
    await this.closeOverlays();
    await this.travelDateButton.click();

    const label = departureAriaLabel(date);
    const dayCell = this.page.locator(`[aria-label="${label}"]`).first();
    const prev = this.page.getByRole('button', { name: 'Previous month' });
    const nextMonth = this.page.getByRole('button', { name: 'Next month' });

    for (let i = 0; i < 24; i++) {
      if (await dayCell.isVisible().catch(() => false)) {
        await dayCell.click();
        return;
      }

      const canGoPrev = await prev.isEnabled().catch(() => false);
      if (canGoPrev && i < 12) {
        await prev.click();
      } else {
        await nextMonth.click();
      }
      await this.page.waitForTimeout(250);
    }

    throw new Error(`Could not find calendar day: ${label}`);
  }

  async search(): Promise<void> {
    await this.closeOverlays();
    // Button label is "Explore" until both airports are set, then "Search".
    const search = this.page.getByRole('button', { name: /^Search$/i });
    const explore = this.page.getByRole('button', { name: /^Explore$/i });
    if (await search.isVisible().catch(() => false)) {
      await search.click();
    } else {
      await explore.click();
    }
    await this.page.waitForURL(/flights\.booking\.com\/flights\//, { timeout: 60_000 });
  }

  async waitForResults(): Promise<void> {
    await expect(
      this.page.getByText(/We found \d+ flight|Showing \d+ results|flight options/i).first(),
    ).toBeVisible({ timeout: 60_000 });
  }

  async expectRouteInUrl(from: string, to: string, depart: Date): Promise<void> {
    const iso = toISODate(depart);
    await expect(this.page).toHaveURL(new RegExp(`${from}.*${to}`, 'i'));
    await expect(this.page).toHaveURL(new RegExp(`depart=${iso}`));
  }

  async expectSelectedTravelDate(date: Date): Promise<void> {
    const short = shortDayMonth(date);
    await expect(this.travelDateButton).toContainText(new RegExp(short, 'i'));
  }

  async expectResultsShowSelectedDate(date: Date): Promise<void> {
    const short = shortDayMonth(date);
    await expect(this.page.getByText(new RegExp(`DEL\\s*·\\s*${short}`, 'i')).first()).toBeVisible();
    await expect(this.page.getByText(new RegExp(`BOM\\s*·\\s*${short}`, 'i')).first()).toBeVisible();
  }

  async expectOriginAndDestinationSelected(fromCode: string, toLabel: RegExp): Promise<void> {
    await expect(this.originButton).toContainText(new RegExp(fromCode, 'i'));
    await expect(this.destinationButton).toContainText(toLabel);
  }
}
