import { test, expect, type Page } from "@playwright/test";
const KEY = "note-practice:progress:v1";
const DAY = 86_400_000;
async function seed(page: Page) {
  await page.addInitScript(({key}) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify({version: 1, mastery: {E4: 1, B3: 1}, unlocked: 0, rounds: 1}));
    }
  }, {key: KEY});
}
async function saved(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "{}"), KEY);
}
const open = (page: Page, string: number) => page.locator(`.learning-practice button[data-string="${string}"][data-fret="0"]`);
async function answerDaily(page: Page) {
  const id = await page.getByTestId("note-staff").getAttribute("data-note-id");
  await open(page, id === "E4" ? 1 : 2).click();
}

test("daily practice completes eight prompts, resumes settlement, and advances intervals only across days", async ({page}) => {
  await seed(page);
  await page.goto("/");
  await page.getByRole("button", {name: "Start today’s practice", exact: true}).click();
  await expect(page.getByText("No instrument needed.", {exact: false})).toBeVisible();
  await answerDaily(page);
  const settled = await saved(page);
  await page.reload();
  await expect(page.getByRole("heading", {name: "That's the one!"})).toBeVisible();
  expect((await saved(page)).learning).toEqual(settled.learning);
  await page.getByRole("button", {name: "Next note", exact: true}).click();
  for (let i = 1; i < 8; i++) {
    await answerDaily(page);
    await page.getByRole("button", {name: i === 7 ? "See my progress" : "Next note", exact: true}).click();
  }
  await expect(page.getByRole("heading", {name: "A little more familiar."})).toBeVisible();
  const first = await saved(page);
  expect(first.activity).toBeNull();
  expect(first.unlocked).toBe(0);
  expect(first.rounds).toBe(2);
  expect(first.learning.E4.stage).toBe(1);
  expect(first.learning.B3.stage).toBe(1);
  await page.getByRole("button", {name: "Start today’s practice", exact: true}).click();
  await answerDaily(page);
  expect((await saved(page)).learning.B3.stage).toBe(1);
  // Simulate coming back four days later using the actual saved schema.
  await page.evaluate(({key, day}) => {
    const progress = JSON.parse(localStorage.getItem(key) ?? "{}");
    progress.activity = null;
    for (const record of Object.values(progress.learning) as {lastAttemptAt: number; lastSuccessAt: number; dueAt: number}[]) {
      record.lastAttemptAt -= 4 * day; record.lastSuccessAt -= 4 * day; record.dueAt -= 4 * day;
    }
    localStorage.setItem(key, JSON.stringify(progress));
  }, {key: KEY, day: DAY});
  await page.reload();
  await page.getByRole("button", {name: "Start today’s practice", exact: true}).click();
  await answerDaily(page);
  const later = await saved(page);
  expect(later.learning.B3.stage).toBe(2);
  expect(later.activity.retentionDays).toBe(4);
});

test("daily Help remains assisted across reload and keeps legacy progress", async ({page}) => {
  await seed(page); await page.goto("/");
  await page.getByRole("button", {name: "Start today’s practice", exact: true}).click();
  await page.getByRole("button", {name: "A little help", exact: true}).click();
  const helped = await saved(page);
  expect(helped.activity.assisted[0]).toBe(true);
  await page.reload();
  await answerDaily(page);
  const result = await saved(page);
  const id = result.activity.noteIds[0];
  expect(result.learning[id].stage).toBe(0);
  expect(result.mastery[id]).toBe(0);
  expect(result.rounds).toBe(1);
  expect(result.unlocked).toBe(0);
});

test("melody is playable by taps, reveals only current Help target, and resumes without rescoring", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name: "Open string call, 4 notes", exact: true}).click();
  const phrase = page.getByRole("img", {name: /Melody/});
  await expect(phrase).toBeVisible();
  await expect(page.getByRole("button", {name: "High arc, 5 notes, locked", exact: true})).toBeDisabled();
  await page.getByRole("button", {name: "A little help", exact: true}).click();
  await expect(phrase).toHaveAttribute("aria-label", /E5/);
  await expect(phrase).not.toHaveAttribute("aria-label", /B4/);
  for (let i = 0; i < 4; i++) {
    await open(page, i % 2 === 0 ? 1 : 2).click();
    if (i === 0) {
      const before = await saved(page);
      await page.reload();
      expect((await saved(page)).learning).toEqual(before.learning);
      await expect(page.getByRole("heading", {name: "That's the one!"})).toBeVisible();
    }
    await page.getByRole("button", {name: i === 3 ? "See my progress" : "Next note", exact: true}).click();
  }
  await expect(page.getByRole("heading", {name: "You made a melody."})).toBeVisible();
  expect((await saved(page)).unlocked).toBe(0);
  await expect(page.getByRole("button", {name: "Hear the phrase again"})).toBeVisible();
});

test("phrase preview assists remaining answers and cancels cleanly on navigation", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name: "Open string call, 4 notes", exact: true}).click();
  await page.getByRole("button", {name: "Hear the phrase", exact: true}).click();
  expect((await saved(page)).activity.assisted).toEqual([true, true, true, true]);
  await page.getByRole("button", {name: "Back to lessons", exact: true}).click();
  await page.getByRole("button", {name: "Resume melody", exact: true}).click();
  await expect(open(page, 1)).toBeEnabled();
  expect((await saved(page)).activity.assisted).toEqual([true, true, true, true]);
  await page.getByRole("button", {name: "Sound on", exact: true}).click();
  await expect(page.getByRole("button", {name: "Hear the phrase", exact: true})).toBeDisabled();
  await open(page, 1).click();
  expect((await saved(page)).mastery.E4).toBe(0);
});

for (const width of [320, 375, 430]) test(`learning flows fit ${width}px and never request microphone access`, async ({page}) => {
  await page.setViewportSize({width, height: 900});
  await page.emulateMedia({reducedMotion: "reduce"});
  await page.addInitScript(() => {
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { throw Error("Microphone must never be requested"); };
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", {name: "Open string call, 4 notes", exact: true}).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const rect = await open(page, 1).boundingBox();
  expect(rect?.width).toBeGreaterThanOrEqual(44);
  expect(rect?.height).toBeGreaterThanOrEqual(44);
  await open(page, 1).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", {name: "That's the one!"})).toBeVisible();
  expect(errors).toEqual([]);
  await expect(page.getByText(/microphone|guitar input/i)).toHaveCount(0);
});
