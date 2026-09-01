const test = require("node:test");
const assert = require("node:assert/strict");
const {
  intervalsOverlap,
  normalizeIntervals,
  normalizeMinutes,
} = require("../lib/serviceSchedulingPolicy");

test("aceita durações configuráveis em minutos", () => {
  assert.equal(normalizeMinutes(15), 15);
  assert.equal(normalizeMinutes(45), 45);
  assert.equal(normalizeMinutes(180), 180);
});

test("recusa horários inválidos e ordena intervalos", () => {
  assert.deepEqual(normalizeIntervals([
    {start: "13:00", end: "18:00"},
    {start: "08:00", end: "12:00"},
    {start: "25:00", end: "26:00"},
  ]), [
    {start: "08:00", end: "12:00"},
    {start: "13:00", end: "18:00"},
  ]);
});

test("detecta intervalos sobrepostos", () => {
  assert.equal(intervalsOverlap([
    {start: "08:00", end: "12:00"},
    {start: "11:30", end: "14:00"},
  ]), true);
  assert.equal(intervalsOverlap([
    {start: "08:00", end: "12:00"},
    {start: "13:00", end: "18:00"},
  ]), false);
});
