import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { Context } from "grammy";

// Comprehensive conversation context types
export type UserContext = {
  fitnessLevel?: "beginner" | "intermediate" | "advanced";
  currentGoals?: string[];
  preferences?: {
    workoutTime?: "morning" | "afternoon" | "evening";
    workoutDuration?: "short" | "medium" | "long";
    equipment?: string[];
    injuries?: string[];
  };
  profile?: {
    age?: number;
    weight?: number;
    height?: number;
    activityLevel?:
      | "sedentary"
      | "lightly_active"
      | "moderately_active"
      | "very_active";
  };
};

export type SessionContext = {
  startTime: number;
  lastActivity: number;
  messageCount: number;
  isWaiting: boolean;
  waitingFor?: string;
  currentPhase?: "greeting" | "onboarding" | "active_chat" | "workout_session";
};

export type LLMMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  toolCalls?: unknown[];
  toolResults?: unknown[];
};

export type LLMContext = {
  lastResponseId?: string;
  messages: LLMMessage[];
  systemState?: unknown;
  conversationMemory?: {
    summary?: string;
    keyPoints?: string[];
    userMood?: string;
    lastWorkoutType?: string;
  };
};

export type DomainContext = {
  // Fitness-specific context
  currentWorkout?: {
    type: string;
    exercises: Array<{
      name: string;
      sets?: number;
      reps?: number;
      duration?: number;
    }>;
    startTime?: number;
    completed?: boolean;
  };
  workoutHistory?: Array<{
    date: string;
    type: string;
    duration: number;
    exercises: string[];
  }>;
  fitnessMetrics?: {
    lastWeightCheckin?: number;
    strengthLevel?: number;
    enduranceLevel?: number;
    flexibilityLevel?: number;
  };
};

export type ComprehensiveContext = {
  user: UserContext;
  session: SessionContext;
  llm: LLMContext;
  domain?: DomainContext;
};

// Bot context types - Fix type compatibility issue
export type MyContext = ConversationFlavor<Context>;
export type MyConversation = Conversation<Context>;

// Conversation types
export type ConversationType =
  | "onboarding"
  | "fitness_chat"
  | "workout_session"
  | "quick_challenge";

export interface ConversationMeta {
  id: string;
  type: ConversationType;
  userId: number;
  chatId: number;
  status: "active" | "paused" | "completed" | "cancelled";
  currentStep?: string;
}

// Onboarding flow types
export interface OnboardingData {
  fitnessLevel?: "beginner" | "intermediate" | "advanced";
  goals?: string[];
  equipment?: string[];
  injuries?: string[];
  workoutTime?: "morning" | "afternoon" | "evening";
  experience?: string;
}

export interface OnboardingStep {
  id: string;
  question: string;
  type: "text" | "choice" | "multi_choice";
  options?: string[];
  validation?: (answer: string) => boolean;
  next?: (answer: string) => string | null;
}

// Workout session types
export interface WorkoutSession {
  id: string;
  type: string;
  exercises: Exercise[];
  startTime: number;
  currentExercise: number;
  completed: boolean;
}

export interface Exercise {
  name: string;
  type: "reps" | "duration" | "distance";
  target: number;
  unit: string;
  completed?: boolean;
  completedAt?: number;
}

// Agent response types
export interface AgentResponse {
  text?: string;
  toolCalls?: any[];
  toolResults?: any[];
  responseId?: string;
  conversationMemory?: any;
}

// Database conversation record
export interface ConversationRecord {
  _id: string;
  conversationId: string;
  telegramId: number;
  chatId: number;
  type: ConversationType;
  status: string;
  currentStep?: string;
  context: ComprehensiveContext;
  metadata?: any;
  createdAt: number;
  updatedAt: number;
}
