export interface ArticleSection {
  heading: string;
  paragraphs: string[];
}

export interface ArticleFaq {
  question: string;
  answer: string;
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  keywords: string[];
  sections: ArticleSection[];
  faqs?: ArticleFaq[];
}

export const articles: Article[] = [
  {
    slug: "client-retention-for-personal-trainers",
    title: "Client Retention for Personal Trainers: How to Keep Clients Longer",
    description:
      "Why personal training clients drop off, how to measure your retention rate, and the coaching habits that keep clients training for years instead of months.",
    publishedAt: "2026-08-05",
    updatedAt: "2026-08-05",
    keywords: [
      "client retention",
      "how to improve client retention",
      "personal trainer client retention",
      "client retention rate",
    ],
    sections: [
      {
        heading: "What client retention means for a personal trainer",
        paragraphs: [
          "Client retention is the share of clients who keep training with you over a given period. If you start January with 20 clients and 16 of them are still with you in June, your six-month retention rate is 80 percent. The formula is simple: clients at the end of the period, minus new clients gained, divided by clients at the start, multiplied by 100.",
          "Retention matters more than acquisition for most independent trainers. Every client who leaves has to be replaced before you grow, and replacing a client costs marketing time, consultation calls, and onboarding effort. A trainer with strong retention spends their energy coaching rather than constantly selling.",
        ],
      },
      {
        heading: "Why clients actually leave",
        paragraphs: [
          "The most common reason is not price and not the workouts. It is loss of visible progress. When a client cannot see that they are stronger, fitter, or more consistent than they were three months ago, the sessions start to feel like a cost rather than an investment.",
          "The second reason is the gap between sessions. A client who trains with you twice a week spends roughly 165 hours a week without you. If nothing connects those hours to their goal, the relationship depends entirely on the two hours you share — and the moment life gets busy, those two hours are the first thing cut.",
          "The third is a lack of structure. Clients who do not know what the next block looks like, what they are working toward, or when they will be reassessed have nothing to stay for once the novelty fades.",
        ],
      },
      {
        heading: "Make progress visible",
        paragraphs: [
          "Progress that is not recorded is progress the client forgets. Log every session — the exercises, the sets, the reps, the weights — so you can show a client in month four exactly what they were lifting in month one.",
          "In ValhallaFit, each client session is stored against the plan you prescribed, with target-versus-actual deltas on reps and weight. When a client says they feel stuck, you can open their history and show the numbers instead of arguing about a feeling.",
          "Review progress out loud on a regular cadence — monthly is enough. Name specific numbers: a squat that went from 40kg to 60kg, a streak of 14 completed sessions, a first unassisted pull-up. Specific evidence renews commitment in a way that generic encouragement does not.",
        ],
      },
      {
        heading: "Own the time between sessions",
        paragraphs: [
          "Retention is won in the gaps. Give clients something to do and something to report when you are not with them: a plan they can start on any day, a step target, a mobility routine, or a short weekly check-in on weight, sleep, and energy.",
          "Because ValhallaFit plans repeat weekly, a client can open their phone on any day, start the next training day, and log it themselves. You see the session appear in their history, so you know who is training and who has gone quiet — before they disappear.",
          "Act on silence quickly. A client who has not logged a session in ten days is a retention problem you can still fix with a two-line message. The same client at six weeks is usually gone.",
        ],
      },
      {
        heading: "Build a group, not a list of individuals",
        paragraphs: [
          "Clients who feel part of something stay longer than clients who feel like a booking slot. A shared challenge, a small group chat, or a monthly leaderboard turns isolated sessions into a community that carries its own momentum.",
          "Community also protects you against schedule changes. When a client moves, changes jobs, or drops to one session a month, a group they belong to keeps them attached to your coaching rather than to a specific hour in your calendar.",
        ],
      },
      {
        heading: "Track the number so you can improve it",
        paragraphs: [
          "Calculate your retention rate every quarter using the formula above, and record why each departing client left. Patterns show up fast: if most clients leave around month three, your problem is usually the first reassessment; if they leave after a holiday break, your problem is the gap between sessions.",
          "A good target for an independent trainer is a majority of clients still active after twelve months. Whatever your starting point, measuring it turns retention from a vague worry into something you can coach against.",
        ],
      },
      {
        heading: "A simple retention routine",
        paragraphs: [
          "Log every session so progress is provable. Send a weekly check-in and read the answers. Reassess and share the numbers monthly. Run a four-week challenge each quarter to create fresh goals. Reach out within a week of any client going quiet.",
          "None of these depend on new clients. They depend on making the training relationship visible, structured, and continuous — which is exactly what ValhallaFit is built for.",
        ],
      },
    ],
  },
  {
    slug: "keep-clients-engaged-between-sessions",
    title: "How to Keep Clients Engaged Between Training Sessions",
    description:
      "Practical ways personal trainers can stay connected with clients between sessions — weekly check-ins, self-guided plans, progress reviews, and community habits that prevent drop-off.",
    publishedAt: "2026-08-05",
    updatedAt: "2026-08-05",
    keywords: [
      "client engagement",
      "keep clients motivated",
      "online coaching check ins",
      "personal trainer client engagement",
    ],
    sections: [
      {
        heading: "The problem with two hours a week",
        paragraphs: [
          "Most personal training relationships are built on one to three hours of contact per week. Everything that determines whether a client reaches their goal — sleep, food, walking, recovery, and the workouts they do alone — happens outside those hours.",
          "Trainers who only exist inside the session are competing with everything else in a client's week. Trainers who show up in the gap become part of the client's routine, and that is what keeps people training for years.",
        ],
      },
      {
        heading: "Run a weekly check-in",
        paragraphs: [
          "A check-in is a short, repeatable set of questions the client answers once a week: bodyweight if relevant, energy, sleep, soreness, how the sessions felt, and anything that got in the way. Five fields, two minutes to fill in.",
          "The value is not the data alone — it is the ritual. A client who knows a check-in is coming stays mentally engaged all week, and you get an early warning signal when something slips. Reply to every check-in, even with two sentences; an unanswered check-in stops happening within a month.",
        ],
      },
      {
        heading: "Give them a plan they can run without you",
        paragraphs: [
          "Clients disengage when there is nothing to do until the next booked session. A reusable weekly plan fixes that: the client opens their phone, picks a training day, and works through it on their own, logging each set as they go.",
          "In ValhallaFit, plans repeat weekly rather than expiring, so a client can train on any day that suits them. Every self-guided session lands in their history, which means solo work still counts as coached work — and you can review it later.",
        ],
      },
      {
        heading: "Close the loop on what they log",
        paragraphs: [
          "Logged data that nobody looks at teaches clients that logging is pointless. Review sessions between appointments and reference them by name: a specific set that went up, a session where reps dropped off, a movement that keeps getting skipped.",
          "ValhallaFit shows what the client actually lifted against what you prescribed, so this review takes a few minutes rather than an evening. The client learns that you are watching, which is the single strongest engagement driver there is.",
        ],
      },
      {
        heading: "Use short challenges to reset motivation",
        paragraphs: [
          "Motivation decays on a predictable curve. A four-week challenge — a consistency streak, a strength ladder, a daily step target — resets it with a fresh deadline and a clear finish line.",
          "Keep challenges specific and short, tie them to the plan you already prescribed, and review the result out loud when they end. Then start the next one.",
        ],
      },
      {
        heading: "Let clients see each other",
        paragraphs: [
          "Engagement compounds when clients are not training in isolation. A shared challenge board, a group chat, or a monthly recap of everyone's wins gives clients a reason to show up that does not depend on your reminders.",
          "This is where community-focused coaching separates itself from session-selling. The trainer becomes the centre of a group people want to belong to, and belonging outlasts motivation.",
        ],
      },
      {
        heading: "What good engagement looks like in practice",
        paragraphs: [
          "A client trains with you once a week, runs two self-guided sessions from their plan, logs all three, submits a Friday check-in, and gets a reply plus a monthly progress review. That client has around eight touchpoints a month with your coaching instead of four hours of contact.",
          "That is the difference between a client who renews and a client who quietly stops booking. ValhallaFit is built to make those touchpoints practical for a trainer coaching a real roster of people.",
        ],
      },
    ],
  },
  {
    slug: "fitness-challenges-for-personal-trainers",
    title: "Fitness Challenges for Personal Trainers: Ideas That Keep Clients Engaged",
    description:
      "Practical fitness challenge ideas personal trainers can run with their clients to boost engagement, build consistency, and create shareable wins.",
    publishedAt: "2026-08-05",
    updatedAt: "2026-08-05",
    keywords: ["fitness challenges", "fitness challenge ideas", "personal trainer"],
    sections: [
      {
        heading: "Why run fitness challenges with your clients",
        paragraphs: [
          "Fitness challenges are short, structured goals that give clients something specific to aim for between training sessions. A 30-day challenge creates a clear deadline, a measurable outcome, and a sense of momentum that keeps clients showing up when motivation dips.",
          "For personal trainers, challenges are also a marketing tool. A client who completes a 30-day challenge and sees real progress is likely to share it — and that word-of-mouth brings in referrals. Challenges work best when they are tied to your training program, not a generic template you found online.",
        ],
      },
      {
        heading: "Challenge idea 1: 30-day consistency streak",
        paragraphs: [
          "The simplest challenge: the client commits to training a set number of days per week for 30 days. The goal is not to lift more weight — it is to build the habit of showing up. Track each completed session and celebrate the streak.",
          "In ValhallaFit, this maps naturally to a weekly plan. You assign a plan with the target number of training days, and each completed session is logged automatically. The client can see their session history build up over the 30 days.",
        ],
      },
      {
        heading: "Challenge idea 2: Progressive strength ladder",
        paragraphs: [
          "Pick one or two compound lifts — squat, deadlift, bench press, or overhead press. Over four weeks, the client aims to increase their top working set weight each session. The challenge is to add weight every time without losing form.",
          "This works well with progressive programming. Set target weights in the plan that increase week over week, and review the client's actual lifts versus your prescription after each session. ValhallaFit's performance deltas show you exactly how much the client lifted compared to what you prescribed.",
        ],
      },
      {
        heading: "Challenge idea 3: Step and movement goal",
        paragraphs: [
          "Not every challenge needs to be about lifting. A daily step goal — 8,000 or 10,000 steps — combined with the client's training plan gives them something to focus on between gym sessions. This is especially useful for clients whose main goal is fat loss or general health.",
          "Track steps outside the app and check in weekly. The training plan handles the structured work; the step goal fills the gaps on non-training days.",
        ],
      },
      {
        heading: "Challenge idea 4: Skill milestone challenge",
        paragraphs: [
          "Choose a skill the client wants to learn — a first pull-up, a bodyweight dip, a strict push-up, or holding a plank for two minutes. Structure the training plan around progressions toward that skill, and set a 4-6 week deadline to achieve it.",
          "Skill-based challenges are highly motivating because the outcome is binary: you either did the pull-up or you did not. Break the skill down into progression steps in your plan, and celebrate each step the client unlocks.",
        ],
      },
      {
        heading: "How to structure a challenge in ValhallaFit",
        paragraphs: [
          "Create a plan that lasts the duration of the challenge — typically four weeks. Add training days with exercises that support the challenge goal. Set target reps, sets, and weights that progress week over week. Assign the plan to the client.",
          "The client starts a session for each training day, logs their actual performance, and completes it. You review their logged sessions each week, see how they are tracking against the targets, and adjust the plan if needed. When the 30 days are up, you can start a new round or move to a different challenge — the plan is reusable.",
        ],
      },
      {
        heading: "Tips for running challenges that work",
        paragraphs: [
          "Keep it specific. 'Get fitter in 30 days' is not a challenge — 'train three times a week for 30 days and add 5kg to your squat' is. The client needs to know exactly what success looks like.",
          "Keep it short. Four weeks is the sweet spot — long enough to see progress, short enough to stay focused. Avoid open-ended challenges with no deadline.",
          "Celebrate the finish. When the challenge ends, review the results with the client. Show them the numbers — sessions completed, weight added, skills achieved — and plan the next block together.",
        ],
      },
    ],
  },
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
