import { useQuery } from '@tanstack/react-query'

const fetchRecommendations = async () => {
  const res = await fetch('/api/recommendations', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch recommendations')
  return res.json()
}

export function useRecommendations() {
  return useQuery({
    queryKey: ['recommendations'],
    queryFn: fetchRecommendations,
    staleTime: 60_000,
  })
}
