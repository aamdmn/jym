import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";

// Create or update an exercise
export const createOrUpdateExercise = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    sourceUrl: v.string(),
    media: v.object({
      primary_gif: v.optional(v.string()),
      primary_video: v.optional(v.string()),
      thumbnail: v.optional(v.string()),
      banner_image: v.optional(v.string()),
      additional_media: v.array(
        v.object({
          type: v.string(),
          url: v.string(),
          description: v.optional(v.string()),
        })
      ),
    }),
    muscleGroups: v.object({
      primary: v.array(
        v.object({
          name: v.string(),
          icon_url: v.optional(v.string()),
        })
      ),
      secondary: v.array(
        v.object({
          name: v.string(),
          icon_url: v.optional(v.string()),
        })
      ),
    }),
    equipment: v.object({
      primary: v.optional(
        v.object({
          name: v.string(),
          type: v.string(),
          image_url: v.optional(v.string()),
        })
      ),
      additional: v.array(
        v.object({
          name: v.string(),
          type: v.string(),
          image_url: v.optional(v.string()),
        })
      ),
    }),
    metadata: v.object({
      difficulty: v.optional(v.string()),
      exercise_type: v.optional(v.string()),
      log_type: v.optional(v.string()),
      force: v.optional(v.string()),
      mechanic: v.optional(v.string()),
      category: v.optional(v.string()),
    }),
    instructions: v.object({
      main: v.optional(v.string()),
      steps: v.array(v.string()),
      tips: v.array(v.string()),
      warnings: v.array(v.string()),
    }),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if exercise already exists
    const existing = await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      // Update existing exercise
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }
    // Create new exercise
    return await ctx.db.insert("exercises", {
      ...args,
      createdAt: now,
      updatedAt: now,
      status: "active",
    });
  },
});

// Batch create or update exercises
export const batchCreateOrUpdateExercises = mutation({
  args: {
    exercises: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        sourceUrl: v.string(),
        media: v.object({
          primary_gif: v.optional(v.string()),
          primary_video: v.optional(v.string()),
          thumbnail: v.optional(v.string()),
          banner_image: v.optional(v.string()),
          additional_media: v.array(
            v.object({
              type: v.string(),
              url: v.string(),
              description: v.optional(v.string()),
            })
          ),
        }),
        muscleGroups: v.object({
          primary: v.array(
            v.object({
              name: v.string(),
              icon_url: v.optional(v.string()),
            })
          ),
          secondary: v.array(
            v.object({
              name: v.string(),
              icon_url: v.optional(v.string()),
            })
          ),
        }),
        equipment: v.object({
          primary: v.optional(
            v.object({
              name: v.string(),
              type: v.string(),
              image_url: v.optional(v.string()),
            })
          ),
          additional: v.array(
            v.object({
              name: v.string(),
              type: v.string(),
              image_url: v.optional(v.string()),
            })
          ),
        }),
        metadata: v.object({
          difficulty: v.optional(v.string()),
          exercise_type: v.optional(v.string()),
          log_type: v.optional(v.string()),
          force: v.optional(v.string()),
          mechanic: v.optional(v.string()),
          category: v.optional(v.string()),
        }),
        instructions: v.object({
          main: v.optional(v.string()),
          steps: v.array(v.string()),
          tips: v.array(v.string()),
          warnings: v.array(v.string()),
        }),
        tags: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results: string[] = [];

    for (const exercise of args.exercises) {
      // Check if exercise already exists
      const existing = await ctx.db
        .query("exercises")
        .withIndex("by_slug", (q) => q.eq("slug", exercise.slug))
        .first();

      if (existing) {
        // Update existing exercise
        await ctx.db.patch(existing._id, {
          ...exercise,
          updatedAt: now,
        });
        results.push(existing._id);
      } else {
        // Create new exercise
        const id = await ctx.db.insert("exercises", {
          ...exercise,
          createdAt: now,
          updatedAt: now,
          status: "active",
        });
        results.push(id);
      }
    }

    return results;
  },
});

// Get exercise by slug
export const getExerciseBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("exercises"),
      _creationTime: v.number(),
      slug: v.string(),
      name: v.string(),
      sourceUrl: v.string(),
      media: v.object({
        primary_gif: v.optional(v.string()),
        primary_video: v.optional(v.string()),
        thumbnail: v.optional(v.string()),
        banner_image: v.optional(v.string()),
        additional_media: v.array(
          v.object({
            type: v.string(),
            url: v.string(),
            description: v.optional(v.string()),
          })
        ),
      }),
      muscleGroups: v.object({
        primary: v.array(
          v.object({
            name: v.string(),
            icon_url: v.optional(v.string()),
          })
        ),
        secondary: v.array(
          v.object({
            name: v.string(),
            icon_url: v.optional(v.string()),
          })
        ),
      }),
      equipment: v.object({
        primary: v.optional(
          v.object({
            name: v.string(),
            type: v.string(),
            image_url: v.optional(v.string()),
          })
        ),
        additional: v.array(
          v.object({
            name: v.string(),
            type: v.string(),
            image_url: v.optional(v.string()),
          })
        ),
      }),
      metadata: v.object({
        difficulty: v.optional(v.string()),
        exercise_type: v.optional(v.string()),
        log_type: v.optional(v.string()),
        force: v.optional(v.string()),
        mechanic: v.optional(v.string()),
        category: v.optional(v.string()),
      }),
      instructions: v.object({
        main: v.optional(v.string()),
        steps: v.array(v.string()),
        tips: v.array(v.string()),
        warnings: v.array(v.string()),
      }),
      tags: v.array(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      status: v.optional(
        v.union(v.literal("active"), v.literal("draft"), v.literal("archived"))
      ),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Check if exercise exists by slug (public query but useful for scraper)
export const exerciseExists = query({
  args: { slug: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const exercise = await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    return !!exercise;
  },
});

// Get exercises for workout generation (lightweight with just essential info)
export const getExercisesForWorkout = query({
  args: {
    equipment: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    muscleGroup: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      slug: v.string(),
      name: v.string(),
      difficulty: v.optional(v.string()),
      category: v.optional(v.string()),
      exerciseType: v.optional(v.string()),
      primaryMuscles: v.array(v.string()),
      secondaryMuscles: v.array(v.string()),
      primaryEquipment: v.optional(v.string()),
      hasVideo: v.boolean(),
      hasGif: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const allExercises = await ctx.db
      .query("exercises")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Map to lightweight format
    const exerciseList = allExercises.map((ex) => ({
      slug: ex.slug,
      name: ex.name,
      difficulty: ex.metadata.difficulty,
      category: ex.metadata.category,
      exerciseType: ex.metadata.exercise_type,
      primaryMuscles: ex.muscleGroups.primary.map((m) => m.name),
      secondaryMuscles: ex.muscleGroups.secondary.map((m) => m.name),
      primaryEquipment: ex.equipment.primary?.name,
      hasVideo: !!ex.media.primary_video,
      hasGif: !!ex.media.primary_gif,
    }));

    // Apply filters if provided
    let filtered = exerciseList;

    if (args.difficulty) {
      filtered = filtered.filter(
        (ex) => ex.difficulty?.toLowerCase() === args.difficulty?.toLowerCase()
      );
    }

    if (args.category) {
      filtered = filtered.filter(
        (ex) => ex.category?.toLowerCase() === args.category?.toLowerCase()
      );
    }

    if (args.muscleGroup) {
      filtered = filtered.filter(
        (ex) =>
          ex.primaryMuscles.some(
            (m) => m.toLowerCase() === args.muscleGroup?.toLowerCase()
          ) ||
          ex.secondaryMuscles.some(
            (m) => m.toLowerCase() === args.muscleGroup?.toLowerCase()
          )
      );
    }

    if (args.equipment) {
      filtered = filtered.filter(
        (ex) =>
          ex.primaryEquipment?.toLowerCase() ===
            args.equipment?.toLowerCase() ||
          args.equipment?.toLowerCase() === "bodyweight"
      );
    }

    return filtered;
  },
});

// Get all exercises with pagination
export const listExercises = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    category: v.optional(v.string()),
    muscleGroup: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    let exercises: Doc<"exercises">[];

    if (args.difficulty) {
      exercises = await ctx.db
        .query("exercises")
        .withIndex("by_difficulty", (q) =>
          q.eq("metadata.difficulty", args.difficulty)
        )
        .take(limit);
    } else if (args.category) {
      exercises = await ctx.db
        .query("exercises")
        .withIndex("by_category", (q) =>
          q.eq("metadata.category", args.category)
        )
        .take(limit);
    } else {
      exercises = await ctx.db.query("exercises").take(limit);
    }

    // Filter by muscle group if specified
    if (args.muscleGroup) {
      return exercises.filter((exercise) =>
        exercise.muscleGroups.primary.some(
          (m) => m.name.toLowerCase() === args.muscleGroup?.toLowerCase()
        )
      );
    }

    return exercises;
  },
});

// Search exercises
export const searchExercises = query({
  args: {
    searchText: v.string(),
    difficulty: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("exercises")
      .withSearchIndex("search_exercises", (q) => {
        let searchQuery = q.search("name", args.searchText);

        if (args.difficulty) {
          searchQuery = searchQuery.eq("metadata.difficulty", args.difficulty);
        }
        if (args.category) {
          searchQuery = searchQuery.eq("metadata.category", args.category);
        }

        return searchQuery;
      })
      .take(args.limit || 20);

    return results;
  },
});

// Helper to count items in a record
const incrementCount = (record: Record<string, number>, key: string): void => {
  record[key] = (record[key] || 0) + 1;
};

// Get exercise statistics
export const getExerciseStats = query({
  handler: async (ctx) => {
    const exercises = await ctx.db.query("exercises").collect();

    const stats = {
      total: exercises.length,
      byDifficulty: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byMuscleGroup: {} as Record<string, number>,
      byEquipment: {} as Record<string, number>,
      withMedia: {
        gifs: 0,
        videos: 0,
        thumbnails: 0,
      },
    };

    for (const exercise of exercises) {
      // Count by difficulty
      if (exercise.metadata.difficulty) {
        incrementCount(stats.byDifficulty, exercise.metadata.difficulty);
      }

      // Count by category
      if (exercise.metadata.category) {
        incrementCount(stats.byCategory, exercise.metadata.category);
      }

      // Count by muscle groups
      for (const muscle of exercise.muscleGroups.primary) {
        incrementCount(stats.byMuscleGroup, muscle.name);
      }

      // Count by equipment
      if (exercise.equipment.primary) {
        incrementCount(stats.byEquipment, exercise.equipment.primary.name);
      }

      // Count media
      if (exercise.media.primary_gif) {
        stats.withMedia.gifs++;
      }
      if (exercise.media.primary_video) {
        stats.withMedia.videos++;
      }
      if (exercise.media.thumbnail) {
        stats.withMedia.thumbnails++;
      }
    }

    return stats;
  },
});

// Get exercises by muscle group
export const getExercisesByMuscleGroup = query({
  args: {
    muscleGroup: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const exercises = await ctx.db.query("exercises").take(args.limit || 100);

    return exercises.filter(
      (exercise) =>
        exercise.muscleGroups.primary.some(
          (m) => m.name.toLowerCase() === args.muscleGroup.toLowerCase()
        ) ||
        exercise.muscleGroups.secondary.some(
          (m) => m.name.toLowerCase() === args.muscleGroup.toLowerCase()
        )
    );
  },
});

// Get exercises by equipment
export const getExercisesByEquipment = query({
  args: {
    equipment: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const exercises = await ctx.db.query("exercises").take(args.limit || 100);

    return exercises.filter(
      (exercise) =>
        exercise.equipment.primary?.name.toLowerCase() ===
          args.equipment.toLowerCase() ||
        exercise.equipment.additional.some(
          (e) => e.name.toLowerCase() === args.equipment.toLowerCase()
        )
    );
  },
});

// Delete exercise
export const deleteExercise = mutation({
  args: { id: v.id("exercises") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Archive exercise (soft delete)
export const archiveExercise = mutation({
  args: { id: v.id("exercises") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

// Internal mutation to store scraped exercise data
export const storeScrapedExercise = internalMutation({
  args: {
    slug: v.string(),
    name: v.string(),
    sourceUrl: v.string(),
    media: v.object({
      primary_gif: v.optional(v.string()),
      primary_video: v.optional(v.string()),
      thumbnail: v.optional(v.string()),
      banner_image: v.optional(v.string()),
      additional_media: v.array(
        v.object({
          type: v.string(),
          url: v.string(),
          description: v.optional(v.string()),
        })
      ),
    }),
    muscleGroups: v.object({
      primary: v.array(
        v.object({
          name: v.string(),
          icon_url: v.optional(v.string()),
        })
      ),
      secondary: v.array(
        v.object({
          name: v.string(),
          icon_url: v.optional(v.string()),
        })
      ),
    }),
    equipment: v.object({
      primary: v.optional(
        v.object({
          name: v.string(),
          type: v.string(),
          image_url: v.optional(v.string()),
        })
      ),
      additional: v.array(
        v.object({
          name: v.string(),
          type: v.string(),
          image_url: v.optional(v.string()),
        })
      ),
    }),
    metadata: v.object({
      difficulty: v.optional(v.string()),
      exercise_type: v.optional(v.string()),
      log_type: v.optional(v.string()),
      force: v.optional(v.string()),
      mechanic: v.optional(v.string()),
      category: v.optional(v.string()),
    }),
    instructions: v.object({
      main: v.optional(v.string()),
      steps: v.array(v.string()),
      tips: v.array(v.string()),
      warnings: v.array(v.string()),
    }),
    tags: v.array(v.string()),
  },
  returns: v.id("exercises"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if exercise already exists
    const existing = await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      // Update existing exercise
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new exercise
    return await ctx.db.insert("exercises", {
      ...args,
      createdAt: now,
      updatedAt: now,
      status: "active",
    });
  },
});
