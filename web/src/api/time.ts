export const Days = [
  { value: 8, label: "N'importe quel jour" },
  { value: 0, label: "Dimanche" },
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" }
];

export const Hours = Array(24)
  .fill(0)
  .map((value, index) => ({ value: index, label: `${index} h` }));