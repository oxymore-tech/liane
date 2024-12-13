export const sync = <TNew, TOld>(
  newest: TNew[],
  previous: TOld[],
  convert: (v: TNew) => TOld,
  keyNew: (v: TNew) => string,
  keyOld: (v: TOld) => string,
  removeIf: (value: TNew, old: TOld) => boolean = () => false
) => {
  // Remove reminders for updated and deleted lianes
  const fetchedLianeIds: { [id: string]: TNew } = newest.reduce((a, v) => ({ ...a, [keyNew(v)!]: v }), {});
  const removed = [];
  const added = [];
  for (let i = previous.length - 1; i >= 0; i--) {
    if (!fetchedLianeIds[keyOld(previous[i])] || removeIf(fetchedLianeIds[keyOld(previous[i])], previous[i])) {
      // Remove liane
      removed.push(previous[i]);
      previous.splice(i, 1);
    }
  }
  // Create reminder for updated or new lianes
  const storedLianeIds = new Set(previous.map(d => keyOld(d)));
  const toAdd = newest.filter(l => !storedLianeIds.has(keyNew(l)!));
  for (const liane of toAdd) {
    previous.push(convert(liane));
    added.push(liane);
  }

  return { stored: previous, removed, added };
};
