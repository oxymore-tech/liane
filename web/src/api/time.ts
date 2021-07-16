export const Days = [
  { value: 8, label: "N'importe quel jour" },
  { value: 1, label: "Dimanche" },
  { value: 2, label: "Lundi" },
  { value: 3, label: "Mardi" },
  { value: 4, label: "Mercredi" },
  { value: 5, label: "Jeudi" },
  { value: 6, label: "Vendredi" },
  { value: 7, label: "Samedi" }
];

export const Hours = Array(24)
  .fill(0)
  .map((value, index) => ({ value: index + 1, label: `${index} h` }));