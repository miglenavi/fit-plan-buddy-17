import { createTestUser, linkTrainerClient, admin } from "./helpers";
const t = await createTestUser("trainer-ui", "trainer");
const c = await createTestUser("client-ui", "client");
await linkTrainerClient(t.id, c.id);
const { data: pull } = await admin.from("exercises").select("id").is("trainer_id", null).limit(6);
const s = await t.client.from("training_sessions").insert({ client_id: c.id, trainer_id: t.id, status: "in_progress", logged_by: "trainer", custom_name: "QA UI" }).select("id").single();
await t.client.from("session_exercises").insert(pull!.map((e, i) => ({ session_id: s.data!.id, exercise_id: e.id, order_index: i, target_sets: 3 })));
const { data: sess } = await t.client.auth.getSession();
console.log(JSON.stringify({ t: t.id, c: c.id, sid: s.data!.id, session: sess.session }));
