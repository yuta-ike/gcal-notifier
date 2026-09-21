export const collectPages = async <TPage, TItem>(
  loadPage: (pageToken?: string) => Promise<TPage>,
  getItems: (page: TPage) => TItem[] | undefined,
  getNextPageToken: (page: TPage) => string | undefined,
): Promise<TItem[]> => {
  const items: TItem[] = []
  let pageToken: string | undefined

  do {
    const page = await loadPage(pageToken)
    items.push(...(getItems(page) ?? []))
    pageToken = getNextPageToken(page)
  } while (pageToken != null)

  return items
}
