"use strict";

const STORAGE_KEY = "daymark.habits";

const form = document.querySelector("#add-form");
const habitInput = document.querySelector("#habit-name");
const habitList = document.querySelector("#habit-list");
const emptyState = document.querySelector("#empty-state");
const habitCount = document.querySelector("#habit-count");
const formMessage = document.querySelector("#form-message");
const todayLabel = document.querySelector("#today-label");

let habits = loadHabits();
const today = getLocalDateKey(new Date());

todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
}).format(new Date());

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = habitInput.value.trim();

  if (!name) {
    formMessage.textContent = "Give your habit a name to get started.";
    habitInput.focus();
    return;
  }

  if (habits.some((habit) => habit.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    formMessage.textContent = "That habit is already on your list.";
    habitInput.focus();
    return;
  }

  habits.unshift({
    id: createId(),
    name,
    completedDates: [],
  });
  saveHabits();
  renderHabits();
  form.reset();
  formMessage.textContent = "";
  habitInput.focus();
});

habitList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-habit-id]");
  if (!button) return;

  if (button.dataset.action === "delete") {
    habits = habits.filter((habit) => habit.id !== button.dataset.habitId);
    saveHabits();
    renderHabits();
    return;
  }

  const habit = habits.find((item) => item.id === button.dataset.habitId);
  if (!habit) return;

  const completed = habit.completedDates.includes(today);
  habit.completedDates = completed
    ? habit.completedDates.filter((date) => date !== today)
    : [...habit.completedDates, today];
  saveHabits();
  renderHabits();
});

function loadHabits() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("Saved habit data is not a list.");

    return parsed
      .filter((habit) => (
        habit
        && typeof habit.id === "string"
        && typeof habit.name === "string"
        && Array.isArray(habit.completedDates)
      ))
      .map((habit) => ({
        id: habit.id,
        name: habit.name,
        completedDates: [...new Set(
          habit.completedDates.filter(isDateKey),
        )].sort(),
      }));
  } catch (error) {
    console.error("Could not load saved habits.", error);
    formMessage.textContent = "Saved habits couldn’t be loaded. You can still add new ones.";
    return [];
  }
}

function saveHabits() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error("Could not save habits to local storage.", error);
    formMessage.textContent = "Changes couldn’t be saved in this browser.";
  }
}

function renderHabits() {
  habitList.replaceChildren();
  emptyState.hidden = habits.length > 0;
  habitCount.textContent = String(habits.length);

  const fragment = document.createDocumentFragment();
  for (const habit of habits) {
    const doneToday = habit.completedDates.includes(today);
    const streak = getCurrentStreak(habit.completedDates);
    const card = document.createElement("article");
    card.className = `habit-card${doneToday ? " is-done" : ""}`;

    const info = document.createElement("div");
    info.className = "habit-info";

    const name = document.createElement("h3");
    name.className = "habit-name";
    name.textContent = habit.name;

    const status = document.createElement("p");
    status.className = "habit-status";
    status.textContent = doneToday ? "Nice work — done for today" : "A little progress goes a long way";
    info.append(name, status);

    const actions = document.createElement("div");
    actions.className = "habit-actions";

    const streakLabel = document.createElement("span");
    streakLabel.className = "streak";
    streakLabel.setAttribute("aria-label", `${streak} day${streak === 1 ? "" : "s"} current streak`);

    const flame = document.createElement("span");
    flame.className = "streak-flame";
    flame.setAttribute("aria-hidden", "true");
    flame.textContent = "↗";

    const streakNumber = document.createElement("span");
    streakNumber.textContent = `${streak} ${streak === 1 ? "day" : "days"}`;
    streakLabel.append(flame, streakNumber);

    const toggle = document.createElement("button");
    toggle.className = "toggle-button";
    toggle.type = "button";
    toggle.dataset.habitId = habit.id;
    toggle.setAttribute("aria-pressed", String(doneToday));
    toggle.setAttribute(
      "aria-label",
      doneToday ? `Undo ${habit.name} for today` : `Mark ${habit.name} done today`,
    );

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "toggle-icon";
    toggleIcon.setAttribute("aria-hidden", "true");
    toggleIcon.textContent = doneToday ? "✓" : "";

    const toggleText = document.createElement("span");
    toggleText.textContent = doneToday ? "Done today" : "Mark done";
    toggle.append(toggleIcon, toggleText);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.dataset.habitId = habit.id;
    deleteButton.dataset.action = "delete";
    deleteButton.setAttribute("aria-label", `Delete ${habit.name}`);
    deleteButton.title = "Delete habit";
    deleteButton.textContent = "×";

    actions.append(streakLabel, toggle, deleteButton);
    card.append(info, actions);
    fragment.append(card);
  }

  habitList.append(fragment);
}

function getCurrentStreak(completedDates) {
  const completed = new Set(completedDates);
  const cursor = new Date();
  if (!completed.has(getLocalDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (completed.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function createId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

renderHabits();
