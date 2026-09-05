import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanupUsers, createTestUser, linkTrainerClient, type TestUser } from "./helpers";

/** Private trainer notes: only the owning trainer may read or write them. */
describe("client_notes privacy", () => {
  let trainer: TestUser;
  let otherTrainer: TestUser;
  let client: TestUser;
  let noteId: string;

  beforeAll(async () => {
    trainer = await createTestUser("trainer-notes", "trainer");
    otherTrainer = await createTestUser("trainer2-notes", "trainer");
    client = await createTestUser("client-notes", "client");
    await linkTrainerClient(trainer.id, client.id);
  }, 90_000);

  afterAll(async () => {
    await cleanupUsers([trainer.id, otherTrainer.id, client.id]);
  }, 90_000);

  it("trainer can create and read notes for their own client", async () => {
    const ins = await trainer.client
      .from("client_notes")
      .insert({ trainer_id: trainer.id, client_id: client.id, body: "QA note one" })
      .select("id, body")
      .single();
    expect(ins.error).toBeNull();
    noteId = ins.data!.id;

    const read = await trainer.client
      .from("client_notes")
      .select("id, body")
      .eq("client_id", client.id);
    expect(read.error).toBeNull();
    expect(read.data).toHaveLength(1);
    expect(read.data![0].body).toBe("QA note one");
  });

  it("the client the note is about cannot read it", async () => {
    const read = await client.client.from("client_notes").select("id, body");
    expect(read.data ?? []).toHaveLength(0);

    const byId = await client.client.from("client_notes").select("id").eq("id", noteId);
    expect(byId.data ?? []).toHaveLength(0);
  });

  it("an unrelated trainer cannot read or write notes for someone else's client", async () => {
    const read = await otherTrainer.client.from("client_notes").select("id");
    expect(read.data ?? []).toHaveLength(0);

    const write = await otherTrainer.client
      .from("client_notes")
      .insert({ trainer_id: otherTrainer.id, client_id: client.id, body: "should fail" });
    expect(write.error).not.toBeNull();

    // and they cannot spoof ownership either
    const spoof = await otherTrainer.client
      .from("client_notes")
      .insert({ trainer_id: trainer.id, client_id: client.id, body: "should also fail" });
    expect(spoof.error).not.toBeNull();

    const total = await admin.from("client_notes").select("id").eq("client_id", client.id);
    expect(total.data).toHaveLength(1);
  });

  it("a client cannot write notes about themselves", async () => {
    const res = await client.client
      .from("client_notes")
      .insert({ trainer_id: trainer.id, client_id: client.id, body: "client-authored" });
    expect(res.error).not.toBeNull();
  });
});
