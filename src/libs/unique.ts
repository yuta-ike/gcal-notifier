export const unique = <Item, Key extends PropertyKey>(
  items: Item[],
  getKey: (item: Item) => Key,
) => {
  const map = new Map<Key, Item>()
  for (const item of items) {
    const key = getKey(item)
    if (map.has(key)) {
      continue
    }
    map.set(key, item)
  }

  return map.values()
}
