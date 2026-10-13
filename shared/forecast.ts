/** Shared presentation scenario; these numbers are not a prediction model. */
export const forecastScenario = {
  riskValues: [13, 12, 9, 18, 26, 22, 35, 57, 78, 69, 48, 25],
  hourLabels: ["06 h", "12 h", "18 h", "23 h"],
  peakStartIndex: 7,
  peakEndIndex: 9,
  peakLabel: "78 % vers 18 h",
  windowStart: "18:00",
  windowEnd: "20:30",
  durationLabel: "2 h 30",
  chartDescription:
    "Exemple simulé : le risque de coupure atteint 78 % vers 18 h, puis diminue en soirée.",
} as const;
