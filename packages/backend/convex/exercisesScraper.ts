"use node";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { firecrawl } from "./firecrawl";

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
      // Just get HTML and markdown - much faster!
      const scrapeResult = await firecrawl.scrape(args.url, {
        formats: ["html", "markdown"],
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

// Scrape multiple exercises
export const scrapeExercises = action({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    total: v.number(),
    successful: v.number(),
    failed: v.number(),
    skipped: v.number(),
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
    skipped: number;
    errors: string[];
  }> => {
    const limit = args.limit || 5;

    try {
      // Map the URLs
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
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          errors: [mapResult.error || "Failed to map exercise URLs"],
        };
      }

      const urlsToScrape: string[] = mapResult.urls.slice(0, limit);

      let successful = 0;
      let failed = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Scrape each exercise
      for (let i = 0; i < urlsToScrape.length; i++) {
        const url = urlsToScrape[i];

        try {
          // Extract slug from URL to check if it exists
          const slug = url.split("/").pop() || "";

          if (slug) {
            // Check if exercise already exists
            const exists = await ctx.runQuery(api.exercises.exerciseExists, {
              slug,
            });

            if (exists) {
              skipped++;
              continue; // Skip to next URL (no delay needed for skipped)
            }
          }

          const result = await ctx.runAction(
            internal.exercisesScraper.scrapeExercise,
            {
              url,
            }
          );

          if (result?.success) {
            successful++;
          } else {
            // Check if it's a rate limit error
            const errorMsg = result?.error || "";
            if (errorMsg.includes("Rate limit exceeded")) {
              // Extract retry time from error message if available
              const retryMatch = errorMsg.match(/retry after (\d+)s/);
              const retrySeconds = retryMatch
                ? Number.parseInt(retryMatch[1])
                : 60;

              // Wait for the suggested time plus a buffer
              await new Promise((resolve) =>
                setTimeout(resolve, (retrySeconds + 2) * 1000)
              );

              // Retry this URL by decrementing the counter
              i--;
              continue;
            }

            failed++;
            errors.push(errorMsg || `Failed to scrape ${url}`);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";

          // Check if it's a rate limit error
          if (errorMsg.includes("Rate limit exceeded")) {
            const retryMatch = errorMsg.match(/retry after (\d+)s/);
            const retrySeconds = retryMatch
              ? Number.parseInt(retryMatch[1])
              : 60;

            // Wait for the suggested time plus a buffer
            await new Promise((resolve) =>
              setTimeout(resolve, (retrySeconds + 2) * 1000)
            );

            // Retry this URL
            i--;
            continue;
          }

          failed++;
          errors.push(`Error scraping ${url}: ${errorMsg}`);
        }

        // Delay between requests: 7 seconds to stay under 10/min rate limit
        // (60 seconds / 10 requests = 6 seconds minimum, use 7 for safety)
        if (i < urlsToScrape.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 7000));
        }
      }

      return {
        success: successful > 0,
        total: urlsToScrape.length,
        successful,
        failed,
        skipped,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  },
});
