"use strict";

const COURSES = [
  { id: "maths", title: "Mathématiques 5", short: "Maths", weight: 3, groups: [
    { title: "Moyenne des examens", weight: 1, notes: [{ id: "math_ds1", label: "DS1", weight: 1 }, { id: "math_ds2", label: "DS2", weight: 1 }] }
  ] },
  { id: "electro", title: "Électrostatique & Magnétostatique", short: "Électro", weight: 3, groups: [
    { title: "Moyenne des examens", weight: 1, notes: [{ id: "elec_ds1", label: "DS1", weight: 1 }, { id: "elec_ds2", label: "DS2", weight: 1 }] }
  ] },
  { id: "python", title: "Programmation en Python", short: "Python", weight: 6, groups: [
    { title: "Moyenne des contrôles continus", weight: 1, notes: [{ id: "py_ns1", label: "NS1", weight: 1 }] },
    { title: "Projet", weight: 2, notes: [{ id: "py_proj", label: "Note de projet", weight: 1 }] }
  ] },
  { id: "bdd", title: "Bases de données", short: "BDD", weight: 4, groups: [
    { title: "Moyenne des contrôles continus", weight: 1, notes: [
      { id: "bdd_ns1", label: "NS1", weight: 1 },
      { id: "bdd_ns2", label: "NS2", weight: 1 },
      { id: "bdd_participation", label: "Participation", weight: 1 }
    ] },
    { title: "Moyenne des examens", weight: 2, notes: [{ id: "bdd_ds1", label: "DS1", weight: 1 }] }
  ] }
];
const TOTAL_COURSE_WEIGHT = 16;
const TOTAL_NOTES = 10;
// Formats acceptés : 0 à 20, point ou virgule, sans limite artificielle à 2 décimales.
function parseGrade(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const normalized = String(raw).trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return NaN;
  const result = Number(normalized);
  return Number.isFinite(result) && result >= 0 && result <= 20 ? result : NaN;
}
function weightedAverage(items) {
  let numerator = 0, denominator = 0;
  for (const item of items) {
    if (item.value !== null && Number.isFinite(item.value)) {
      numerator += item.value * item.weight;
      denominator += item.weight;
    }
  }
  return denominator > 0 ? numerator / denominator : null;
}
function calculate(values) {
  const courses = COURSES.map(course => {
    let entered = 0;
    const groups = course.groups.map(group => {
      const noteItems = group.notes.map(note => {
        const value = parseGrade(values[note.id]);
        if (value !== null && Number.isFinite(value)) entered++;
        return { value, weight: note.weight };
      });
      return { value: weightedAverage(noteItems), weight: group.weight };
    });
    const total = course.groups.reduce((sum, group) => sum + group.notes.length, 0);
    return { id: course.id, title: course.title, weight: course.weight, average: weightedAverage(groups), entered, total, complete: entered === total };
  });
  const entered = courses.reduce((sum, course) => sum + course.entered, 0);
  const complete = entered === TOTAL_NOTES;
  const baseAverage = weightedAverage(courses.map(course => ({ value: course.average, weight: course.weight })));
  const parsedBonus = parseGrade(values.bonus);
  const bonusValid = parsedBonus === null || (Number.isFinite(parsedBonus) && parsedBonus <= 1);
  const bonus = parsedBonus === null ? 0 : parsedBonus;
  const average = baseAverage === null || !bonusValid ? null : baseAverage + bonus;
  const allAboveSeven = complete && courses.every(course => course.average >= 7);
  return { courses, entered, complete, average, baseAverage, bonus, bonusValid, allAboveSeven, totalWeight: TOTAL_COURSE_WEIGHT };
}

const STORE_KEY = "ece-s5-notes-v1";
const noteLabel = note => note.id === "py_proj" ? "Projet" : note.label;
const format2 = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false
});
const fmt = value => value === null ? "—" : format2.format(value);
const byId = id => document.getElementById(id);

const data = Object.create(null);
const noteFields = [];
const courseViews = new Map();
const bonusInput = byId("bonus-input");
const bonusError = byId("bonus-error");
const resetButton = byId("reset-button");
const resetDialog = byId("reset-dialog");

function storageFail() {
  byId("storage-note").textContent = "Stockage local indisponible. Les notes restent sur cette page.";
}

function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return;
    for (const course of COURSES) {
      for (const group of course.groups) {
        for (const note of group.notes) {
          if (typeof stored[note.id] === "string") data[note.id] = stored[note.id];
        }
      }
    }
    if (typeof stored.bonus === "string") data.bonus = stored.bonus;
  } catch {
    storageFail();
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    storageFail();
  }
}

function validateField(input, error, invalid, description = "") {
  input.classList.toggle("invalid", invalid);
  input.setAttribute("aria-invalid", String(invalid));
  error.hidden = !invalid;
  const describedBy = [description, invalid ? error.id : ""].filter(Boolean).join(" ");
  if (describedBy) input.setAttribute("aria-describedby", describedBy);
  else input.removeAttribute("aria-describedby");
}

function renderCourses() {
  const courseTemplate = byId("course-template");
  const noteTemplate = byId("note-template");
  const notesBody = byId("notes-body");

  for (const course of COURSES) {
    const row = courseTemplate.content.firstElementChild.cloneNode(true);
    const title = row.querySelector("h3");
    title.id = "course-" + course.id;
    title.textContent = course.title;
    row.setAttribute("aria-labelledby", title.id);
    row.querySelector(".course-icon").src = "assets/marks/" + course.id + ".webp";
    row.querySelector(".course-coefficient").textContent = "Coefficient " + course.weight;

    const fields = row.querySelector(".course-fields");
    const notes = course.groups.flatMap(group => group.notes.map(note => ({ note, group })));
    // Keep the familiar DS, NS and Projet entry order from the previous interface.
    notes.sort((a, b) => noteLabel(a.note).localeCompare(noteLabel(b.note), "fr"));
    for (const { note, group } of notes) {
      const field = noteTemplate.content.firstElementChild.cloneNode(true);
      const label = field.querySelector("label");
      const input = field.querySelector("input");
      const error = field.querySelector(".cell-error");
      const name = noteLabel(note);

      input.id = "input-" + note.id;
      error.id = "error-" + note.id;
      label.htmlFor = input.id;
      label.textContent = name;
      input.setAttribute("aria-label", course.title + " — " + name + " sur 20");
      if (group.weight === 2) {
        const badge = document.createElement("span");
        badge.className = "block-badge";
        badge.textContent = "×2";
        badge.setAttribute("aria-hidden", "true");
        label.append(badge);
        input.setAttribute("aria-label", input.getAttribute("aria-label") + ", bloc coefficient 2");
      }

      const initial = parseGrade(data[note.id]);
      input.value = Number.isFinite(initial) ? fmt(initial) : (data[note.id] || "");
      input.addEventListener("input", () => {
        data[note.id] = input.value;
        save();
        update();
      });
      input.addEventListener("focus", () => {
        if (Number.isFinite(parseGrade(data[note.id]))) input.value = data[note.id].replace(".", ",");
        input.select();
      });
      input.addEventListener("blur", () => {
        const value = parseGrade(data[note.id]);
        if (Number.isFinite(value)) input.value = fmt(value);
      });
      const fieldIndex = noteFields.length;
      input.addEventListener("keydown", event => {
        if (event.key !== "Enter" || event.isComposing) return;
        event.preventDefault();
        const next = noteFields[fieldIndex + 1];
        if (next) next.input.focus();
        else input.blur();
      });

      noteFields.push({ id: note.id, input, error });
      fields.append(field);
    }

    courseViews.set(course.id, {
      result: row.querySelector(".course-result"),
      average: row.querySelector(".average-value"),
      status: row.querySelector(".status-cell")
    });
    notesBody.append(row);
  }
}

function update() {
  for (const { id, input, error } of noteFields) {
    validateField(input, error, Number.isNaN(parseGrade(data[id])));
  }

  const result = calculate(data);
  validateField(bonusInput, bonusError, !result.bonusValid, "bonus-range");
  resetButton.disabled = !Object.values(data).some(value => value !== "");

  const compensation = result.complete && result.bonusValid && result.average >= 10;
  for (const course of result.courses) {
    const view = courseViews.get(course.id);
    const average = course.average;
    const passed = average !== null && average >= 10;
    const compensated = compensation && average >= 7 && average < 10;

    view.average.textContent = fmt(average);
    view.result.classList.toggle("pass", passed);
    view.result.classList.toggle("compensated", compensated);
    view.status.classList.toggle("pass", passed && course.complete);
    view.status.classList.toggle("compensated", compensated);

    if (average === null) view.status.textContent = "À renseigner";
    else if (!course.complete) view.status.textContent = "Provisoire " + course.entered + "/" + course.total;
    else if (passed) view.status.textContent = "≥ 10";
    else if (compensated) view.status.textContent = "Compensée";
    else view.status.textContent = average < 7 ? "Sous 7" : "Sous 10";
  }

  byId("ue-average").textContent = fmt(result.average);
  byId("bonus-detail").textContent = result.baseAverage === null || !result.bonusValid
    ? "Moyenne pondérée avec bonus"
    : fmt(result.baseAverage) + " + " + fmt(result.bonus) + " de bonus";
  byId("progress-label").textContent = result.entered + " / " + TOTAL_NOTES;
  byId("progress-fill").style.width = result.entered / TOTAL_NOTES * 100 + "%";
  byId("progress-bar").setAttribute("aria-valuenow", String(result.entered));

  let status = "En attente des notes";
  let hint = "Les champs vides sont exclus du calcul.";
  let tone = "";
  if (!result.bonusValid) {
    status = "Bonus invalide";
    hint = "Saisissez un bonus entre 0 et 1.";
    tone = "attention";
  } else if (result.entered > 0 && !result.complete) {
    status = "Moyenne provisoire";
    hint = "Compensation calculée après saisie de toutes les notes.";
  } else if (compensation) {
    status = "Moyenne UE ≥ 10";
    hint = result.allAboveSeven ? "Les matières entre 7 et 10 peuvent être compensées." : "Au moins une matière est sous 7.";
    tone = result.allAboveSeven ? "good" : "attention";
  } else if (result.complete) {
    status = "Moyenne UE sous 10";
    hint = "Les matières sous 10 ne sont pas compensées.";
    tone = "attention";
  }
  byId("ue-status").className = "metric-state" + (tone ? " " + tone : "");
  byId("ue-status-text").textContent = status;
  byId("ue-hint").textContent = hint;
}

load();
renderCourses();
bonusInput.value = data.bonus || "";
bonusInput.addEventListener("input", () => {
  data.bonus = bonusInput.value;
  save();
  update();
});

document.querySelector(".masthead-link").addEventListener("click", () => {
  byId("calculs").open = true;
});

resetButton.addEventListener("click", () => {
  resetDialog.returnValue = "";
  resetDialog.showModal();
});
resetDialog.addEventListener("close", () => {
  if (resetDialog.returnValue !== "reset") return;
  for (const key of Object.keys(data)) delete data[key];
  for (const { input } of noteFields) input.value = "";
  bonusInput.value = "";
  save();
  update();
  noteFields[0].input.focus();
});

update();
