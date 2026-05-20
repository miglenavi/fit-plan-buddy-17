ALTER TABLE public.exercises ALTER COLUMN trainer_id DROP NOT NULL;

DROP POLICY IF EXISTS "Trainer manages own exercises" ON public.exercises;

CREATE POLICY "Trainers view all exercises"
ON public.exercises FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Trainer inserts own exercises"
ON public.exercises FOR INSERT TO authenticated
WITH CHECK (auth.uid() = trainer_id AND public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Trainer updates own exercises"
ON public.exercises FOR UPDATE TO authenticated
USING (auth.uid() = trainer_id)
WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainer deletes own exercises"
ON public.exercises FOR DELETE TO authenticated
USING (auth.uid() = trainer_id);

INSERT INTO public.exercises (trainer_id, name, muscle_group, description) VALUES
  (NULL, 'Back Squat', 'Legs', 'Barbell back squat. Bar on upper traps, brace, descend to parallel, drive through mid-foot.'),
  (NULL, 'Front Squat', 'Legs', 'Bar racked on front delts, elbows high, upright torso, full depth.'),
  (NULL, 'Romanian Deadlift', 'Hamstrings', 'Hinge at hips, slight knee bend, lower bar along legs to mid-shin, squeeze glutes up.'),
  (NULL, 'Conventional Deadlift', 'Back', 'Bar over mid-foot, neutral spine, push the floor away, lock out hips and knees together.'),
  (NULL, 'Bench Press', 'Chest', 'Flat barbell bench. Retract scapula, bar to lower chest, press to lockout.'),
  (NULL, 'Incline Dumbbell Press', 'Chest', '30-45 deg bench. Press dumbbells from chest level to lockout.'),
  (NULL, 'Overhead Press', 'Shoulders', 'Standing barbell press from front rack to overhead lockout.'),
  (NULL, 'Pull-Up', 'Back', 'Dead hang to chin over bar, control descent.'),
  (NULL, 'Chin-Up', 'Back', 'Supinated grip pull-up, emphasises biceps.'),
  (NULL, 'Lat Pulldown', 'Back', 'Cable pulldown to upper chest, drive elbows down and back.'),
  (NULL, 'Bent-Over Barbell Row', 'Back', 'Hinge to ~45 deg, row bar to lower ribs, control eccentric.'),
  (NULL, 'Seated Cable Row', 'Back', 'Neutral grip, row to belly, squeeze shoulder blades.'),
  (NULL, 'Dumbbell Lateral Raise', 'Shoulders', 'Raise dumbbells to shoulder height, slight bend in elbow.'),
  (NULL, 'Face Pull', 'Shoulders', 'Rope to face, elbows high, external rotation at end.'),
  (NULL, 'Barbell Hip Thrust', 'Glutes', 'Upper back on bench, bar over hips, drive to full extension.'),
  (NULL, 'Walking Lunge', 'Legs', 'Step forward, drop back knee, drive through front heel.'),
  (NULL, 'Bulgarian Split Squat', 'Legs', 'Rear foot elevated, descend on front leg, drive up.'),
  (NULL, 'Leg Press', 'Legs', 'Feet shoulder-width, full ROM without lower-back rounding.'),
  (NULL, 'Leg Curl', 'Hamstrings', 'Seated or lying, curl heels toward glutes.'),
  (NULL, 'Leg Extension', 'Legs', 'Extend knees to lockout, slow eccentric.'),
  (NULL, 'Calf Raise', 'Calves', 'Full stretch and squeeze at the top.'),
  (NULL, 'Plank', 'Core', 'Forearm plank, neutral spine, glutes and abs braced.'),
  (NULL, 'Hanging Leg Raise', 'Core', 'Hang from bar, raise legs to horizontal or above.'),
  (NULL, 'Cable Crunch', 'Core', 'Kneel under rope, crunch ribcage toward pelvis.'),
  (NULL, 'Barbell Curl', 'Biceps', 'Standing curl, no body english.'),
  (NULL, 'Dumbbell Hammer Curl', 'Biceps', 'Neutral grip curl, targets brachialis.'),
  (NULL, 'Triceps Rope Pushdown', 'Triceps', 'Elbows pinned, extend to lockout, spread rope at bottom.'),
  (NULL, 'Skull Crusher', 'Triceps', 'EZ-bar from forehead to lockout, elbows stable.'),
  (NULL, 'Dip', 'Triceps', 'Parallel bars, slight lean for chest emphasis, upright for triceps.'),
  (NULL, 'Push-Up', 'Chest', 'Body rigid, chest to floor, full lockout.');