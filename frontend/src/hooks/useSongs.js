import { useQuery } from '@tanstack/react-query'

const fetchSongs = async () => {
  const res = await fetch('/api/songs', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch songs')
  return res.json()
}

export function useSongs() {
  return useQuery({ queryKey: ['songs'], queryFn: fetchSongs })
}

export function useSearch(query) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query) return []
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Search failed')
      return res.json()
    },
    enabled: !!query,
  })
}
