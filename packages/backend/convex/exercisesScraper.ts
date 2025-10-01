"use node";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { firecrawl } from "./firecrawl";

/**
 * Exercise Scraper
 *
 * This module provides functions to scrape exercise data from the web with support for
 * concurrent scraping and caching for optimal performance.
 *
 * Performance Features:
 * - Concurrent scraping: Uses 2 concurrent browsers (free plan) for 2x faster scraping
 * - Smart caching: Uses maxAge=1 week for up to 500% faster scrapes on cached pages
 * - Smart batching: Only scrapes unscraped URLs, skips already-scraped ones
 *
 * Usage:
 *
 * 1. Check what's left to scrape:
 *    await ctx.runAction(internal.exercisesScraper.getUnscrapedUrls, {})
 *
 * 2. Manual batching (for precise control):
 *    await ctx.runAction(internal.exercisesScraper.scrapeExercises, {
 *      limit: 20,        // How many to scrape in this batch
 *      offset: 0,        // Start from the beginning of unscraped URLs
 *      concurrency: 2    // Process 2 URLs at once (free plan default)
 *    })
 *
 *    For the next batch:
 *    await ctx.runAction(internal.exercisesScraper.scrapeExercises, {
 *      limit: 20,
 *      offset: 20,       // Continue from where you left off
 *      concurrency: 2
 *    })
 *
 * 3. Automatic batching (recommended for large scrapes):
 *    await ctx.runAction(internal.exercisesScraper.scrapeExercisesBatch, {
 *      batchSize: 20,    // Scrapes 20 at a time, automatically schedules next batch
 *      concurrency: 2    // Process 2 URLs concurrently (free plan: 2, hobby: 5, etc.)
 *    })
 *    This will keep running until all exercises are scraped!
 *
 * Expected Performance (free plan):
 * - Without concurrency + cache: ~10 seconds per exercise
 * - With concurrency (2x) + cache: ~5-6 seconds per exercise
 * - Batch of 20: ~100-120 seconds instead of ~200 seconds
 */

// Map exercise URLs from the source website
export const mapExerciseUrls = action({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    urls: v.array(v.string()),
    total: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    try {
      const mapResult = await firecrawl.map("https://www.jefit.com/exercises", {
        limit: args.limit || 50,
      });

      const hasSuccess = "success" in (mapResult as object);
      const hasLinks = "links" in (mapResult as object);

      // Check if it's the direct data (SDK v2+ style)
      if (!hasSuccess && hasLinks) {
        const links = (mapResult as { links: Array<{ url: string }> }).links;

        if (!links || links.length === 0) {
          throw new Error("No links returned from Firecrawl map API");
        }

        const exerciseUrls = links
          .filter((link) => {
            return (
              link.url.includes("/exercises/") &&
              link.url !== "https://www.jefit.com/exercises"
            );
          })
          .map((link) => link.url);

        if (exerciseUrls.length === 0) {
          throw new Error(
            `Found ${links.length} links but none matched exercise URL pattern`
          );
        }

        return {
          success: true,
          urls: exerciseUrls,
          total: exerciseUrls.length,
        };
      }

      // Otherwise treat it as the old format with success field
      const typedResult = mapResult as {
        success: boolean;
        links?: Array<{ url: string }>;
        error?: string;
      };

      if (!typedResult.success) {
        throw new Error(
          typedResult.error || "Firecrawl map API returned success: false"
        );
      }

      if (!typedResult.links || typedResult.links.length === 0) {
        throw new Error("No links returned from Firecrawl map API");
      }

      const exerciseUrls = typedResult.links
        .filter((link) => {
          return (
            link.url.includes("/exercises/") &&
            link.url !== "https://www.jefit.com/exercises"
          );
        })
        .map((link) => link.url);

      if (exerciseUrls.length === 0) {
        throw new Error(
          `Found ${typedResult.links.length} links but none matched exercise URL pattern`
        );
      }

      return {
        success: true,
        urls: exerciseUrls,
        total: exerciseUrls.length,
      };
    } catch (error) {
      return {
        success: false,
        urls: [],
        total: 0,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in mapExerciseUrls",
      };
    }
  },
});

// Regex patterns for URL extraction (defined at top level for performance)
const GIF_URL_REGEX = /https?:\/\/[^"'\s]+\.gif/i;
const IMAGE_URL_REGEX = /https?:\/\/[^"'\s]+\.(jpg|jpeg|png|webp)/i;
const STEP_INSTRUCTION_REGEX = /\d+\.\s+([^\n]+)/g;
const STEP_NUMBER_PREFIX_REGEX = /^\d+\.\s+/;

// Extract data from scraped content
const extractExerciseData = (html: string, markdown: string, url: string) => {
  const urlSlug = url.split("/").pop() || "unknown";

  // Generate name from slug
  const name = urlSlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Extract GIF URL - look for common patterns
  let gifUrl: string | undefined;

  // Try to find GIF in HTML
  const gifMatch = html.match(GIF_URL_REGEX);
  if (gifMatch) {
    gifUrl = gifMatch[0];
  }

  // Try to find image URLs
  const imageMatch = html.match(IMAGE_URL_REGEX);
  const thumbnailUrl = imageMatch ? imageMatch[0] : undefined;

  // Extract muscle groups from markdown (simple approach)
  const primaryMuscles: string[] = [];
  const secondaryMuscles: string[] = [];

  // Look for common muscle group keywords
  const muscleKeywords = [
    "chest",
    "back",
    "shoulders",
    "biceps",
    "triceps",
    "legs",
    "quads",
    "hamstrings",
    "glutes",
    "calves",
    "abs",
    "core",
    "forearms",
    "lats",
    "delts",
  ];

  const lowerContent = markdown.toLowerCase();
  for (const muscle of muscleKeywords) {
    if (lowerContent.includes(muscle)) {
      primaryMuscles.push(muscle.charAt(0).toUpperCase() + muscle.slice(1));
    }
  }

  // Extract instructions - look for numbered lists or steps
  const instructions: string[] = [];
  const stepMatches = markdown.match(STEP_INSTRUCTION_REGEX);
  if (stepMatches) {
    for (const step of stepMatches) {
      instructions.push(step.replace(STEP_NUMBER_PREFIX_REGEX, "").trim());
    }
  }

  return {
    slug: urlSlug,
    name,
    sourceUrl: url,
    media: {
      primary_gif: gifUrl,
      primary_video: undefined,
      thumbnail: thumbnailUrl,
      banner_image: undefined,
      additional_media: [],
    },
    muscleGroups: {
      primary: primaryMuscles.slice(0, 3).map((muscleName) => ({
        name: muscleName,
        icon_url: undefined,
      })),
      secondary: secondaryMuscles.map((muscleName) => ({
        name: muscleName,
        icon_url: undefined,
      })),
    },
    equipment: {
      primary: undefined,
      additional: [],
    },
    metadata: {
      difficulty: undefined,
      exercise_type: undefined,
      log_type: undefined,
      force: undefined,
      mechanic: undefined,
      category: undefined,
    },
    instructions: {
      main: undefined,
      steps: instructions,
      tips: [],
      warnings: [],
    },
    tags: primaryMuscles.map((m) => m.toLowerCase()),
  };
};

// Scrape a single exercise page (simplified - no AI extraction)
export const scrapeExercise = action({
  args: {
    url: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.boolean(),
      data: v.optional(v.any()),
      error: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    try {
      // Use maxAge for caching since exercise pages are relatively static
      // 1 week = 604800000ms - up to 500% faster for cached pages!
      const scrapeResult = await firecrawl.scrape(args.url, {
        formats: ["html", "markdown"],
        maxAge: 604_800_000, // 1 week cache
      });

      let html = "";
      let markdown = "";

      // Handle different response formats
      if ("html" in scrapeResult && "markdown" in scrapeResult) {
        html = (scrapeResult as { html: string }).html;
        markdown = (scrapeResult as { markdown: string }).markdown;
      } else if ("data" in scrapeResult) {
        const data = (
          scrapeResult as { data: { html?: string; markdown?: string } }
        ).data;
        html = data.html || "";
        markdown = data.markdown || "";
      } else {
        return {
          success: false,
          error: `Unknown response format from Firecrawl for ${args.url}`,
        };
      }

      if (!(html || markdown)) {
        return {
          success: false,
          error: `No content returned from ${args.url}`,
        };
      }

      // Extract data using simple parsing
      const exerciseData = extractExerciseData(html, markdown, args.url);

      // Store in database
      try {
        await ctx.runMutation(
          internal.exercises.storeScrapedExercise,
          exerciseData
        );
      } catch (dbError) {
        return {
          success: false,
          error: `Failed to store in database: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
        };
      }

      return {
        success: true,
        data: exerciseData,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error scraping ${args.url}: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// Get unscraped exercise URLs (filters out already scraped ones)
export const getUnscrapedUrls = action({
  args: {},
  returns: v.object({
    success: v.boolean(),
    urls: v.array(v.string()),
    total: v.number(),
    alreadyScraped: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    try {
      // Map all exercise URLs
      const mapResult: {
        success: boolean;
        urls: string[];
        total: number;
        error?: string;
      } = await ctx.runAction(internal.exercisesScraper.mapExerciseUrls, {
        limit: 5000,
      });

      if (!mapResult.success || mapResult.urls.length === 0) {
        return {
          success: false,
          urls: [],
          total: 0,
          alreadyScraped: 0,
          error: mapResult.error || "Failed to map exercise URLs",
        };
      }

      // Get all existing exercise slugs
      const existingSlugs: string[] = await ctx.runQuery(
        api.exercises.getAllExerciseSlugs,
        {}
      );
      const existingSet = new Set(existingSlugs);

      // Filter out already scraped URLs
      const unscrapedUrls: string[] = [];
      for (const url of mapResult.urls) {
        const slug = url.split("/").pop() || "";
        if (slug && !existingSet.has(slug)) {
          unscrapedUrls.push(url);
        }
      }

      return {
        success: true,
        urls: unscrapedUrls,
        total: unscrapedUrls.length,
        alreadyScraped: mapResult.urls.length - unscrapedUrls.length,
      };
    } catch (error) {
      return {
        success: false,
        urls: [],
        total: 0,
        alreadyScraped: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Scrape multiple exercises with offset and limit for batching (with concurrency support)
export const scrapeExercises = action({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    concurrency: v.optional(v.number()), // Number of concurrent requests (default 2 for free plan)
  },
  returns: v.object({
    success: v.boolean(),
    total: v.number(),
    successful: v.number(),
    failed: v.number(),
    remainingUnscraped: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    total: number;
    successful: number;
    failed: number;
    remainingUnscraped: number;
    errors: string[];
  }> => {
    const limit = args.limit || 5;
    const offset = args.offset || 0;
    const concurrency = args.concurrency || 2; // Free plan has 2 concurrent browsers

    try {
      // Get unscraped URLs
      const unscrapedResult = await ctx.runAction(
        internal.exercisesScraper.getUnscrapedUrls,
        {}
      );

      if (!unscrapedResult.success || unscrapedResult.urls.length === 0) {
        return {
          success: false,
          total: 0,
          successful: 0,
          failed: 0,
          remainingUnscraped: 0,
          errors: [
            unscrapedResult.error ||
              "No unscraped exercises found. All exercises may already be scraped.",
          ],
        };
      }

      // Get the batch to scrape using offset and limit
      const urlsToScrape = unscrapedResult.urls.slice(offset, offset + limit);
      const remainingUnscraped =
        unscrapedResult.urls.length - offset - urlsToScrape.length;

      if (urlsToScrape.length === 0) {
        return {
          success: false,
          total: 0,
          successful: 0,
          failed: 0,
          remainingUnscraped: 0,
          errors: [
            `Offset ${offset} is beyond the available unscraped exercises (${unscrapedResult.urls.length} total)`,
          ],
        };
      }

      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process URLs in chunks based on concurrency
      // Free plan: 10 requests/min = 1 every 6 seconds
      // With 2 concurrent: process 2 URLs, then wait 12 seconds (safe buffer)
      const delayBetweenBatches =
        Math.ceil((60 / 10) * concurrency * 1000) + 2000; // Add 2s buffer

      for (let i = 0; i < urlsToScrape.length; i += concurrency) {
        const chunk = urlsToScrape.slice(i, i + concurrency);

        // Scrape all URLs in this chunk concurrently
        const results = await Promise.all(
          chunk.map(async (url) => {
            try {
              const result = await ctx.runAction(
                internal.exercisesScraper.scrapeExercise,
                { url }
              );
              return { url, result, error: null };
            } catch (error) {
              return {
                url,
                result: null,
                error: error instanceof Error ? error.message : "Unknown error",
              };
            }
          })
        );

        // Process results
        for (const { url, result, error } of results) {
          if (error) {
            failed++;
            errors.push(`Error scraping ${url}: ${error}`);
          } else if (result?.success) {
            successful++;
          } else {
            failed++;
            errors.push(result?.error || `Failed to scrape ${url}`);
          }
        }

        // Delay between batches to respect rate limits
        // Don't delay after the last batch
        if (i + concurrency < urlsToScrape.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenBatches)
          );
        }
      }

      return {
        success: successful > 0,
        total: urlsToScrape.length,
        successful,
        failed,
        remainingUnscraped,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        total: 0,
        successful: 0,
        failed: 0,
        remainingUnscraped: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  },
});

// Scrape exercises in batches with scheduling (automatically continues until done)
export const scrapeExercisesBatch = action({
  args: {
    batchSize: v.optional(v.number()),
    offset: v.optional(v.number()),
    concurrency: v.optional(v.number()), // Number of concurrent requests (default 2 for free plan)
  },
  returns: v.object({
    success: v.boolean(),
    batchSuccessful: v.number(),
    batchFailed: v.number(),
    batchTotal: v.number(),
    remainingUnscraped: v.number(),
    scheduledNext: v.boolean(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10;
    const offset = args.offset || 0;
    const concurrency = args.concurrency || 2; // Free plan has 2 concurrent browsers

    try {
      // Scrape this batch
      const result = await ctx.runAction(
        internal.exercisesScraper.scrapeExercises,
        {
          limit: batchSize,
          offset,
          concurrency,
        }
      );

      // If there are more to scrape, schedule the next batch
      let scheduledNext = false;
      if (result.remainingUnscraped > 0) {
        // Schedule the next batch after a delay
        await ctx.scheduler.runAfter(
          10_000, // 10 seconds delay between batches (reduced since concurrent is faster)
          internal.exercisesScraper.scrapeExercisesBatch,
          {
            batchSize,
            offset: offset + batchSize,
            concurrency,
          }
        );
        scheduledNext = true;
      }

      return {
        success: result.success,
        batchSuccessful: result.successful,
        batchFailed: result.failed,
        batchTotal: result.total,
        remainingUnscraped: result.remainingUnscraped,
        scheduledNext,
        errors: result.errors,
      };
    } catch (error) {
      return {
        success: false,
        batchSuccessful: 0,
        batchFailed: 0,
        batchTotal: 0,
        remainingUnscraped: 0,
        scheduledNext: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  },
});
