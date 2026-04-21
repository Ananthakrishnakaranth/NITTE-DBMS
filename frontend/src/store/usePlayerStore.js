import { create } from 'zustand'

const usePlayerStore = create((set, get) => ({
  nowPlaying: null,
  queue: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,

  play: (song) => {
    const { queue } = get()
    // If not already in queue, prepend
    const inQueue = queue.some((s) => s.song_id === song.song_id)
    set({
      nowPlaying: song,
      isPlaying: true,
      currentTime: 0,
      queue: inQueue ? queue : [song, ...queue],
    })
  },

  pause: () => set({ isPlaying: false }),

  resume: () => set({ isPlaying: true }),

  next: () => {
    const { nowPlaying, queue } = get()
    if (!nowPlaying || queue.length === 0) return
    const idx = queue.findIndex((s) => s.song_id === nowPlaying.song_id)
    const nextSong = queue[idx + 1] || queue[0]
    set({ nowPlaying: nextSong, isPlaying: true, currentTime: 0 })
  },

  prev: () => {
    const { nowPlaying, queue } = get()
    if (!nowPlaying || queue.length === 0) return
    const idx = queue.findIndex((s) => s.song_id === nowPlaying.song_id)
    const prevSong = queue[idx - 1] || queue[queue.length - 1]
    set({ nowPlaying: prevSong, isPlaying: true, currentTime: 0 })
  },

  seek: (t) => set({ currentTime: t }),

  setVolume: (v) => set({ volume: v }),

  setCurrentTime: (t) => set({ currentTime: t }),

  setDuration: (d) => set({ duration: d }),

  addToQueue: (song) =>
    set((state) => ({
      queue: state.queue.some((s) => s.song_id === song.song_id)
        ? state.queue
        : [...state.queue, song],
    })),

  removeFromQueue: (songId) =>
    set((state) => ({
      queue: state.queue.filter((s) => s.song_id !== songId),
    })),
}))

export default usePlayerStore
