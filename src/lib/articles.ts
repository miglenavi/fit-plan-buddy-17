export interface ArticleSection {
  heading: string;
  paragraphs: string[];
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  keywords: string[];
  sections: ArticleSection[];
}

export const articles: Article[] = [
  {
    slug: "workout-plan-builder-for-personal-trainers",
    title: "Workout Plan Builder for Personal Trainers",
    description:
      "How a dedicated workout plan builder helps personal trainers create progressive programs faster than spreadsheets — and what to look for when choosing one.",
    publishedAt: "2026-08-05",
    updatedAt: "2026-08-05",
    keywords: ["workout plan builder", "personal trainer software", "workout plan"],
    sections: [
      {
        heading: "What is a workout plan builder?",
        paragraphs: [
          "A workout plan builder is a tool that lets personal trainers create structured training programs for their clients without spreadsheets or pen and paper. Instead of copying exercises into a grid and manually tracking progress, a plan builder gives you a library of exercises, lets you assemble them into reusable programs, and tracks what each client actually completed.",
          "ValhallaFit is a coaching platform that includes a workout plan builder designed for personal trainers. You build a plan once from your exercise library, assign it to a client, and the client follows it week after week — logging sets, reps, and weights from their phone in the gym.",
        ],
      },
      {
        heading: "Why personal trainers need a dedicated tool",
        paragraphs: [
          "Most trainers start with spreadsheets. They work for one or two clients, but they break down fast: you end up with dozens of files, no easy way to see who is on track, and no way for the client to log their workout without texting you the numbers afterward.",
          "A workout plan builder solves three problems at once. It gives you a reusable exercise library so you are not re-typing movements. It lets clients log their own sessions, so you get accurate data without the back-and-forth. And it keeps every client's history in one place, so you can see progress at a glance instead of digging through files.",
        ],
      },
      {
        heading: "Key features to look for",
        paragraphs: [
          "A reusable exercise library with muscle group tagging, so you can find the right movement quickly. The ability to set target reps, sets, and weights per exercise, and to prescribe alternative exercises when a client cannot do the primary movement.",
          "Progressive programming: plans should be designed to repeat weekly, not be one-off workouts. Each completed session should feed back into your next coaching decision so the client keeps moving forward.",
          "A client experience that works on a phone in the gym. Clients should be able to see today's workout, log each set, and look back at what they lifted last time — all without installing an app.",
        ],
      },
      {
        heading: "How ValhallaFit's plan builder works",
        paragraphs: [
          "You start by building your exercise library. Each exercise has a name, a primary muscle group, and optional secondary muscle groups, so you can filter and find movements by body part. You can add a video or image link for reference.",
          "Next, you create a plan — for example, a four-week strength block. Inside the plan you add training days, and inside each training day you add exercises from your library. For each exercise you set target reps, sets, and weight, and you can assign an alternative exercise with its own targets.",
          "Once the plan is ready, you assign it to a client. The client sees their training days on their phone, starts a session, and logs each set as they go. When they finish, the session is marked complete and you can review what they actually lifted versus what you prescribed.",
          "Plans are reusable: the same plan can produce unlimited weekly sessions, so a client on a four-week block simply starts the next session when they are ready. There is no need to recreate the plan each week.",
        ],
      },
      {
        heading: "Getting started",
        paragraphs: [
          "If you are a personal trainer coaching a handful of clients and tired of managing spreadsheets, you can apply for a ValhallaFit trainer account from the home page. Once approved, you can build your exercise library, create your first plan, and assign it to a client in minutes.",
        ],
      },
    ],
  },
  {
    slug: "how-to-build-a-workout-plan-for-clients",
    title: "How to Build a Workout Plan for Your Clients",
    description:
      "A practical guide for personal trainers on building progressive workout plans — from understanding client goals to selecting exercises and structuring weekly training days.",
    publishedAt: "2026-08-05",
    updatedAt: "2026-08-05",
    keywords: ["how to build a workout plan", "workout plan", "personal trainer"],
    sections: [
      {
        heading: "Start with the client's goal",
        paragraphs: [
          "Before you pick a single exercise, you need to know what the client is training for. A client who wants to build muscle needs a different plan from one who wants to lose fat or improve athletic performance. Ask about their experience level, how many days per week they can train, any injuries or limitations, and what equipment they have access to.",
          "Write the goal down in one sentence. Everything in the plan — exercise selection, set and rep ranges, rest periods — should serve that goal.",
        ],
      },
      {
        heading: "Choose the right exercises",
        paragraphs: [
          "A good workout plan balances compound and isolation movements. Compound exercises like squats, deadlifts, bench presses, and rows work multiple muscle groups and should form the backbone of each session. Isolation exercises target a single muscle group and fill in the gaps.",
          "Group exercises by primary muscle group so you can build balanced sessions. For example, a push day might include a chest compound movement, a shoulder movement, and a triceps isolation exercise. ValhallaFit tags every exercise with a primary muscle group and up to three secondary groups, so you can filter your library by body part when building a session.",
        ],
      },
      {
        heading: "Set reps, sets, and weight targets",
        paragraphs: [
          "Rep ranges should match the goal. For strength, aim for 3-6 reps per set with heavier weights. For muscle growth, 8-12 reps is the standard range. For endurance, 15+ reps with lighter loads. Most general-fitness clients benefit from a mix.",
          "For each exercise, prescribe a target number of sets, target reps, and a starting weight. In ValhallaFit you can also set an alternative exercise with its own targets — useful when a client cannot perform the primary movement due to equipment or mobility limitations.",
        ],
      },
      {
        heading: "Structure the week",
        paragraphs: [
          "Decide how many training days the client can commit to and split the work across them. A common starting point is three days per week: two full-body sessions or an upper/lower/full-body split. More experienced clients can handle four or five days with a push-pull-legs or body-part split.",
          "Each training day in the plan is a template. The client does not need to follow it on a fixed calendar day — they start a session when they are ready, and the plan repeats weekly so the same training day can be used again the next week.",
        ],
      },
      {
        heading: "Apply progressive overload",
        paragraphs: [
          "Progressive overload — gradually increasing the demand on the muscles — is what drives results. The simplest way to apply it is to increase weight, reps, or sets over time. When a client can complete all prescribed reps across all sets with good form, increase the weight slightly the next week.",
          "Review each client's completed sessions regularly. ValhallaFit shows you what the client actually lifted versus what you prescribed, including performance deltas, so you can see when they are ready to progress or when a plan needs adjusting.",
        ],
      },
      {
        heading: "Review and adjust",
        paragraphs: [
          "A workout plan is not set-and-forget. Check in on your clients' completed sessions each week. Look for stalled progress, missed sessions, or signs the plan is too easy or too hard. Adjust the exercises, targets, or volume as needed.",
          "With ValhallaFit, every completed session is stored with the actual weights and reps the client logged. You can pull up a client's history, see their trend over time, and make informed coaching decisions for the next block.",
        ],
      },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
