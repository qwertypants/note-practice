import { expect, test as base, type Page } from "@playwright/test";

const test = base.extend<{ browserErrors: void }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use();
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

const storageKey = "note-practice:progress:v1";
const staff = (page: Page) => page.getByTestId("note-staff");
const positions = (page: Page) =>
  page.locator("button[data-string][data-fret]");
const openString = (page: Page, string: number) =>
  page.locator(`button[data-string="${string}"][data-fret="0"]`);

async function targetString(page: Page) {
  const id = await staff(page).getAttribute("data-note-id");
  // Literal beginner examples: high E sounds E4; open B sounds B3.
  expect(["E4", "B3"]).toContain(id);
  return id === "E4" ? 1 : 2;
}

async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /let.s find a note/i }).click();
  await expect(staff(page)).toBeVisible();
}

async function finishRound(page: Page, firstQuestion = 0) {
  for (let question = firstQuestion; question < 8; question++) {
    await openString(page, await targetString(page)).click();
    await expect(positions(page).first()).toBeDisabled();
    await expect(
      page.getByLabel(`Question ${question + 1} of 8`),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /next note|see my progress/i })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Look at you grow." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /practice again/i }),
  ).toBeVisible();
}

test("beginner recovers from a mistake, finishes eight questions, unlocks through practice, and keeps progress", async ({
  page,
}) => {
  await start(page);
  const firstNote = await staff(page).getAttribute("data-note-id");
  const string = await targetString(page);
  await expect(staff(page)).toHaveAttribute(
    "aria-label",
    string === 1
      ? "Treble staff showing E, written E5"
      : "Treble staff showing B, written B4",
  );
  await openString(page, string === 1 ? 2 : 1).click();
  await expect(staff(page)).toHaveAttribute("data-note-id", firstNote ?? "");
  await expect(page.getByText(/try another position/i)).toBeVisible();
  await expect(openString(page, string)).toBeEnabled();
  await page.getByRole("button", { name: /help/i }).click();
  await expect(page.getByText(/look for/i)).toBeVisible();
  await expect(openString(page, string)).toHaveAttribute(
    "data-highlighted",
    "true",
  );
  await openString(page, string).click();
  await expect(positions(page).first()).toBeDisabled();
  await expect(staff(page)).toHaveAttribute("data-note-id", firstNote ?? "");
  await page
    .getByRole("button", { name: /next note|see my progress/i })
    .click();
  await finishRound(page, 1);
  await page.getByRole("button", { name: /practice again/i }).click();
  await finishRound(page);
  await page.getByRole("button", { name: /practice again/i }).click();
  await expect(page.getByText("name hint tucked away")).toBeVisible();
  await expect(openString(page, 1)).toHaveText("·");
  await expect(openString(page, 2)).toHaveText("·");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    storageKey,
  );
  expect(saved).toMatchObject({
    version: 1,
    unlocked: 1,
    rounds: 2,
    mastery: { E4: 3, B3: 3 },
  });
  await page.reload();
  await expect(page.getByRole("button", { name: /add open g/i })).toBeEnabled();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
      storageKey,
    ),
  ).toEqual(saved);
});

for (const width of [320, 375, 430]) {
  test(`fits a ${width}px phone with touch targets`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await start(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    for (const position of await positions(page).all()) {
      const box = await position.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
}

test("keyboard play and reduced motion remain usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  const correct = openString(page, await targetString(page));
  await page.keyboard.press("Tab");
  await correct.focus();
  await expect(correct).toBeFocused();
  expect(
    await correct.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("solid");
  expect(
    await correct.evaluate((element) => getComputedStyle(element).outlineWidth),
  ).toBe("3px");
  expect(
    await correct.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe("0s");
  await page.keyboard.press("Enter");
  const next = page.getByRole("button", { name: /next note|see my progress/i });
  await expect(next).toBeEnabled();
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(positions(page).first()).toBeEnabled();
});

test("corrupt saved progress still permits a round", async ({ page }) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "{broken"),
    storageKey,
  );
  await start(page);
  await finishRound(page);
});

test("unavailable storage still permits a round", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage unavailable");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage unavailable");
    };
  });
  await start(page);
  await finishRound(page);
});

test("fretted lesson accepts literal pitches with faded hints and help at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          unlocked: 6,
          rounds: 0,
          mastery: { B3: 3, C4: 3, D4: 3, E4: 3 },
        }),
      ),
    storageKey,
  );
  await page.goto("/");
  await page.getByRole("button", { name: /B, C and D/i }).click();
  await expect(positions(page)).toHaveCount(24);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const position of await positions(page).all()) {
    const box = await position.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByText("name hint tucked away")).toBeVisible();
  const literalPositions: Record<
    string,
    { string: number; fret: number; written: string }
  > = {
    B3: { string: 2, fret: 0, written: "B4" },
    C4: { string: 2, fret: 1, written: "C5" },
    D4: { string: 2, fret: 3, written: "D5" },
    E4: { string: 1, fret: 0, written: "E5" },
  };
  const seen = new Set<string>();
  for (let question = 0; question < 8; question++) {
    await page.getByRole("button", { name: /help/i }).click();
    const id = await staff(page).getAttribute("data-note-id");
    const target = literalPositions[id ?? ""];
    if (!target || !id)
      throw new Error(`Unexpected fretted lesson target ${id}`);
    await expect(staff(page)).toHaveAttribute(
      "aria-label",
      `Treble staff showing ${id[0]}, written ${target.written}`,
    );
    const correct = page.locator(
      `button[data-string="${target.string}"][data-fret="${target.fret}"]`,
    );
    await expect(correct).toHaveAttribute("data-highlighted", "true");
    await expect(correct).toHaveText(id[0] ?? "");
    await correct.click();
    await expect(
      page.getByRole("heading", { name: "That’s the one!" }),
    ).toBeVisible();
    await expect(correct).toBeDisabled();
    seen.add(id);
    await page
      .getByRole("button", { name: /next note|see my progress/i })
      .click();
  }
  expect([...seen].sort()).toEqual(["B3", "C4", "D4", "E4"]);
});

test("last lesson celebrates practice without promising another unlock", async ({
  page,
}) => {
  await page.addInitScript(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          unlocked: 10,
          rounds: 0,
          mastery: { E2: 3, F2: 3, G2: 3, A2: 3 },
        }),
      ),
    storageKey,
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Low E, F and G/i }).click();
  const answers: Record<string, [number, number]> = {
    E2: [6, 0],
    F2: [6, 1],
    G2: [6, 3],
    A2: [5, 0],
  };
  for (let question = 0; question < 8; question++) {
    const id = await staff(page).getAttribute("data-note-id");
    const position = answers[id ?? ""];
    if (!position) throw new Error(`Unexpected final-lesson pitch ${id}`);
    await page
      .locator(
        `button[data-string="${position[0]}"][data-fret="${position[1]}"]`,
      )
      .click();
    await page
      .getByRole("button", { name: /next note|see my progress/i })
      .click();
  }
  await expect(
    page.getByText(
      "You’ve reached the last lesson. Revisit any notes whenever you like.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /try the next lesson/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /practice again/i }),
  ).toBeVisible();
});
