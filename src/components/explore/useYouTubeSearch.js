import { useEffect, useState } from "react";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;
const searchCache = new Map();

function readCachedSearch(key) {
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.savedAt > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  // Refresh insertion order so frequently used searches remain in the small cache.
  searchCache.delete(key);
  searchCache.set(key, cached);
  return cached.videos;
}

function cacheSearch(key, videos) {
  searchCache.delete(key);
  searchCache.set(key, { videos, savedAt: Date.now() });
  if (searchCache.size > MAX_CACHE_ENTRIES) {
    searchCache.delete(searchCache.keys().next().value);
  }
}

export function useYouTubeSearch(query, category) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const normalizedQuery = query.trim().replace(/\s+/g, " ");
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

    if (!["songs", "videos"].includes(category) || normalizedQuery.length < 2) {
      setVideos([]);
      setError("");
      setLoading(false);
      return;
    }

    if (!apiKey) {
      setVideos([]);
      setError("YouTube search needs a VITE_YOUTUBE_API_KEY configured in your deployment.");
      setLoading(false);
      return;
    }

    const cacheKey = category + ":" + normalizedQuery.toLocaleLowerCase();
    const cachedVideos = readCachedSearch(cacheKey);
    if (cachedVideos) {
      setVideos(cachedVideos);
      setError("");
      setLoading(false);
      return;
    }

    let alive = true;
    const controller = new AbortController();
    setVideos([]);
    setLoading(true);
    setError("");

    const timer = window.setTimeout(async () => {
      if (!alive) return;

      try {
        const searchParams = {
          part: "snippet",
          type: "video",
          maxResults: "20",
          q: normalizedQuery,
          key: apiKey
        };
        if (category === "songs") searchParams.videoCategoryId = "10";
        const params = new URLSearchParams(searchParams);
        const response = await fetch(
          "https://www.googleapis.com/youtube/v3/search?" + params.toString(),
          { signal: controller.signal }
        );
        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error("YouTube returned an unreadable response.");
        }

        if (!response.ok) {
          throw new Error(data.error?.message || "YouTube search failed.");
        }

        const results = Array.isArray(data.items) ? data.items : [];
        const validVideos = results.filter(video => video?.id?.videoId && video?.snippet);
        if (alive) {
          cacheSearch(cacheKey, validVideos);
          setVideos(validVideos);
        }
      } catch (requestError) {
        if (alive && requestError.name !== "AbortError") {
          setVideos([]);
          setError(requestError.message || "Unable to search YouTube.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }, 450);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, category]);

  return { videos, loading, error };
}
