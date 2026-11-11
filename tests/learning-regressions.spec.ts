import { expect, test, type Page } from "@playwright/test";

const KEY = "note-practice:progress:v1";
const DAY = 86_400_000;
const position = (page: Page, string: number) => page.locator(`button[data-string="${string}"][data-fret="0"]`);
const lesson = (page: Page) => page.locator(".lesson-chip").first();
async function saved(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "{}"), KEY);
}
async function seedLesson(page: Page, legacy = false) {
  await page.addInitScript(({key, legacy}) => {
    if (localStorage.getItem(key)) return;
    const session = {
      lessonId: "open-2", queue: ["E4", "B3", "E4", "B3", "E4", "B3", "E4", "B3"],
      answered: Array(8).fill(false), index: 0, cleanAnswers: 0, bestStreak: 0,
      ...(!legacy && {sessionId: "saved-lesson", attempts: Array.from({length: 8}, () => ({assisted: false, mistakes: 0}))}),
    };
    localStorage.setItem(key, JSON.stringify({version: 1, mastery: {}, unlocked: 0, rounds: 0, session}));
  }, {key: KEY, legacy});
}

for (const assistance of ["Help", "mistake"]) {
  for (const navigation of ["reload", "same lesson"]) {
    test(`lesson ${assistance} survives ${navigation} without clean evidence`, async ({page}) => {
      await seedLesson(page);
      await page.goto("/");
      if (assistance === "Help")
        await page.getByRole("button", {name: /A little help/}).click();
      else await position(page, 6).click();
      const before = await saved(page);
      if (navigation === "reload") await page.reload();
      else await lesson(page).click();
      expect((await saved(page)).session.sessionId).toBe(before.session.sessionId);
      await position(page, 1).click();
      const after = await saved(page);
      expect(after.session.attempts[0]).toEqual({assisted: true, mistakes: assistance === "Help" ? 0 : 1});
      expect(after.session.cleanAnswers).toBe(0);
      expect(after.mastery.E4).toBe(0);
      expect(after.learning.E4).toMatchObject({stage: 0, lastSuccessAt: null, lastSessionId: "saved-lesson"});
    });
  }
}

test("legacy lesson identity is saved on hydration and unresolved evidence stays conservative", async ({page}) => {
  await seedLesson(page, true);
  await page.goto("/");
  await expect.poll(async () => (await saved(page)).session.sessionId).toBeTruthy();
  const initial = await saved(page);
  expect(initial.session.attempts.map((attempt: {assisted: boolean}) => attempt.assisted))
    .toEqual([true, false, false, false, false, false, false, false]);
  await page.reload();
  expect((await saved(page)).session.sessionId).toBe(initial.session.sessionId);
  await position(page, 1).click();
  const after = await saved(page);
  expect(after.session.cleanAnswers).toBe(0);
  expect(after.mastery.E4).toBe(0);
});

test("a lesson resumed after its due date keeps its once-per-session interval guard", async ({page}) => {
  await seedLesson(page);
  await page.clock.install({time: new Date("2026-01-01T12:00:00Z")});
  await page.clock.setFixedTime(new Date("2026-01-01T12:00:00Z"));
  await page.goto("/");
  await position(page, 1).click();
  await page.getByRole("button", {name: /^Next note/}).click();
  await position(page, 2).click();
  await page.getByRole("button", {name: /^Next note/}).click();
  const before = await saved(page);
  await page.clock.setFixedTime(new Date("2026-01-04T12:00:00Z"));
  await page.reload();
  await position(page, 1).click();
  const after = await saved(page);
  expect(after.session.sessionId).toBe(before.session.sessionId);
  expect(after.learning.E4.stage).toBe(1);
  expect(after.learning.E4.dueAt).toBe(before.learning.E4.dueAt);
  expect(after.learning.E4.lastAttemptAt - before.learning.E4.lastAttemptAt).toBe(3 * DAY);
});

test("pending mistake survives backward navigation and reload", async ({page}) => {
  await seedLesson(page);
  await page.goto("/");
  await position(page, 1).click();
  await page.getByRole("button", {name: /^Next note/}).click();
  await position(page, 6).click();
  await page.getByRole("button", {name: "Question 1, answered", exact: true}).click();
  await page.reload();
  await page.getByRole("button", {name: /^Next note/}).click();
  await position(page, 2).click();
  const after = await saved(page);
  expect(after.session.cleanAnswers).toBe(1);
  expect(after.mastery.B3).toBe(0);
  expect(after.learning.B3.lastSuccessAt).toBeNull();
});

test("lesson, review, daily, and melody starts work when randomUUID is unavailable", async ({page}) => {
  await page.addInitScript(() => Object.defineProperty(crypto, "randomUUID", {value: undefined}));
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe("undefined");
  await lesson(page).click();
  const target = await page.getByTestId("note-staff").getAttribute("data-note-id");
  await position(page, target === "E4" ? 1 : 2).click();
  const lessonId = (await saved(page)).session.sessionId;
  await page.getByRole("button", {name: "Practice my weak notes", exact: true}).click();
  await expect(page.getByText("Personalized review", {exact: true})).toBeVisible();
  await page.getByRole("button", {name: "Start today’s practice", exact: true}).click();
  const dailyId = (await saved(page)).activity.sessionId;
  expect(dailyId).not.toBe(lessonId);
  await page.getByRole("button", {name: "Open string call, 4 notes", exact: true}).click();
  const melodyId = (await saved(page)).activity.sessionId;
  expect(melodyId).not.toBe(dailyId);
  await expect(page.locator(".melody-staff")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [320, 375]) test(`active melody notes stay visible at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height: 900});
  await page.emulateMedia({reducedMotion: "reduce"});
  await page.goto("/");
  await page.getByRole("button", {name: "Open string call, 4 notes", exact: true}).click();
  for (let index = 0; index < 4; index++) {
    const viewport = await page.locator(".melody-staff-scroll").boundingBox();
    const note = await page.locator(".melody-note-current").boundingBox();
    if (!viewport || !note) throw Error("Missing melody bounds");
    expect(note.x).toBeGreaterThanOrEqual(viewport.x);
    expect(note.x + note.width).toBeLessThanOrEqual(viewport.x + viewport.width);
    await page.locator(`.learning-practice button[data-string="${index % 2 === 0 ? 1 : 2}"][data-fret="0"]`).click();
    await page.getByRole("button", {name: index === 3 ? "See my progress" : "Next note", exact: true}).click();
  }
  await expect(page.getByRole("heading", {name: "You made a melody."})).toBeVisible();
});

for (const playback of ["preview", "completed replay"]) test(`melody ${playback} updates exposure before later retention`, async ({page}) => {
  await page.addInitScript(({key, day}) => {
    if (localStorage.getItem(key)) return;
    const learning = Object.fromEntries(["E4", "B3"].map(id => [id, {
      lastAttemptAt: day, lastSuccessAt: day, dueAt: day + 86_400_000, stage: 1, lastSessionId: "old",
    }]));
    localStorage.setItem(key, JSON.stringify({version: 1, mastery: {E4: 3, B3: 3}, unlocked: 0, rounds: 1, learning}));
  }, {key: KEY, day: Date.parse("2026-01-01T12:00:00Z")});
  await page.clock.install({time: new Date("2026-01-01T12:00:00Z")});
  await page.clock.setFixedTime(new Date("2026-01-01T12:00:00Z"));
  await page.goto("/");
  await page.getByRole("button", {name: "Open string call, 4 notes", exact: true}).click();
  if (playback === "completed replay") {
    for (let i = 0; i < 4; i++) {
      await position(page, i % 2 === 0 ? 1 : 2).click();
      await page.getByRole("button", {name: i === 3 ? "See my progress" : "Next note", exact: true}).click();
    }
  }
  const before = await saved(page);
  await page.clock.setFixedTime(new Date("2026-01-04T12:00:00Z"));
  await page.getByRole("button", {name: playback === "preview" ? "Hear the phrase" : "Hear the phrase again", exact: true}).click();
  const exposed = await saved(page);
  for (const id of ["E4", "B3"]) {
    expect(exposed.learning[id]).toEqual({...before.learning[id], lastAttemptAt: Date.parse("2026-01-04T12:00:00Z")});
  }
  await page.getByRole("button", {name: "Back to lessons", exact: true}).click();
  await page.clock.setFixedTime(new Date("2026-01-06T12:00:00Z"));
  await page.getByRole("button", {name: "Start today’s practice", exact: true}).click();
  const id = await page.getByTestId("note-staff").getAttribute("data-note-id");
  await position(page, id === "E4" ? 1 : 2).click();
  expect((await saved(page)).activity.retentionDays).toBe(2);
});

test("manual lesson replay updates exposure while automatic playback preserves fresh scoring", async ({page}) => {
  await seedLesson(page);
  await page.clock.install({time: new Date("2026-01-01T12:00:00Z")});
  await page.clock.setFixedTime(new Date("2026-01-01T12:00:00Z"));
  await page.goto("/");
  await position(page, 1).click();
  const before = await saved(page);
  expect(before.learning.E4.stage).toBe(1);
  await page.clock.setFixedTime(new Date("2026-01-04T12:00:00Z"));
  await page.getByRole("button", {name: "Play note E", exact: true}).click();
  expect((await saved(page)).learning.E4).toEqual({...before.learning.E4, lastAttemptAt: Date.parse("2026-01-04T12:00:00Z")});
  await page.clock.setFixedTime(new Date("2026-01-06T12:00:00Z"));
  await page.getByRole("button", {name: "Start today’s practice", exact: true}).click();
  const id = await page.getByTestId("note-staff").getAttribute("data-note-id");
  // E4 has history and is due; unheard B3 has no previous success.
  expect(id).toBe("E4");
  await position(page, 1).click();
  expect((await saved(page)).activity.retentionDays).toBe(2);
});

for (const firstAttempt of ["Help", "mistake"]) test(`repeated lesson Help after ${firstAttempt} refreshes exposure without delaying due date`, async ({page}) => {
  await seedLesson(page);
  await page.clock.install({time: new Date("2026-01-01T12:00:00Z")});
  await page.clock.setFixedTime(new Date("2026-01-01T12:00:00Z"));
  await page.goto("/");
  if (firstAttempt === "Help") await page.getByRole("button", {name: /A little help/}).click();
  else await position(page, 6).click();
  const first = await saved(page);
  await page.clock.setFixedTime(new Date("2026-01-03T12:00:00Z"));
  await page.getByRole("button", {name: /A little help/}).click();
  const repeated = await saved(page);
  expect(repeated.learning.E4.lastAttemptAt - first.learning.E4.lastAttemptAt).toBe(2 * DAY);
  expect(repeated.learning.E4.dueAt).toBe(first.learning.E4.dueAt);
  expect(repeated.learning.E4.stage).toBe(0);
});

test("How to play opens visible instructions and returns to the current melody", async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await page.goto("/");
  await page.getByRole("button", {name: "Open string call, 4 notes", exact: true}).click();
  await page.getByRole("button", {name: /How to play/}).click();
  const heading = page.getByRole("heading", {name: /A little practice/});
  await expect(heading).toBeInViewport();
  await page.getByRole("button", {name: /Back to my notes/}).click();
  await expect(page.locator(".learning-practice")).toBeVisible();
  await expect(page.getByText("1 / 4 notes", {exact: true})).toBeVisible();
});
