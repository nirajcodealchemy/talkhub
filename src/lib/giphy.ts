import { GiphyFetch } from "@giphy/js-fetch-api";

const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

if (!apiKey) {
  throw new Error("Missing NEXT_PUBLIC_GIPHY_API_KEY");
}

export const giphyFetch = new GiphyFetch(apiKey);
