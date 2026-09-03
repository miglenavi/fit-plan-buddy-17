import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  cleanupUsers,
  createTestUser,
  iso,
  linkTrainerClient,
  nextWeekdayAt,
  type TestUser,
} from "./helpers";

/** Scheduling: availability, client self-booking, recurring series, cancellations, isolation. */
describe("scheduling", () => {
  let trainer: TestUser;
  let client: TestUser;
  let outsider: TestUser;

  beforeAll(async () => {
    trainer = await createTestUser("trainer-sched", "trainer");
    client = await createTestUser("client-sched", "client");
    outsider = await createTestUser("outsider-sched", "client");
    await linkTrainerClient(trainer.id, client.id);
  }, 90_000);

  afterAll(async () => {
    await cleanupUsers([trainer.id, client.id, outsider.id]);
  }, 90_000);

  it("trainer adds weekly availability; linked client sees it, outsider does not", async () => {
    const add = await trainer.client
      .from("trainer_availability")
      .insert({
        trainer_id: trainer.id,
        is_recurring: true,
        day_of_week: 2,
        start_time: "09:00:00",
        end_time: "12:00:00",
      })
      .select("id")
      .single();
    expect(add.error).toBeNull();

    const asClient = await client.client
      .from("trainer_availability")
      .select("id")
      .eq("trainer_id", trainer.id);
    expect(asClient.data).toHaveLength(1);

    const asOutsider = await outsider.client
      .from("trainer_availability")
      .select("id")
      .eq("trainer_id", trainer.id);
    expect(asOutsider.data).toHaveLength(0);
  });

  it("client books an open slot with their trainer", async () => {
    const start = nextWeekdayAt(2, 10);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const res = await client.client
      .from("bookings")
      .insert({
        trainer_id: trainer.id,
        client_id: client.id,
        start_at: iso(start),
        end_at: iso(end),
      })
      .select("id, status")
      .single();
    expect(res.error).toBeNull();
    expect(res.data!.status).toBe("booked");

    // overlap protection still applies
    const dup = await client.client.from("bookings").insert({
      trainer_id: trainer.id,
      client_id: client.id,
      start_at: iso(start),
      end_at: iso(end),
    });
    expect(dup.error?.message).toMatch(/already booked/i);

    // client can cancel their own occurrence
    const cancel = await client.client
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", res.data!.id);
    expect(cancel.error).toBeNull();
  });

  it("a client cannot book for a trainer they are not linked to", async () => {
    const start = nextWeekdayAt(3, 11);
    const res = await outsider.client.from("bookings").insert({
      trainer_id: trainer.id,
      client_id: outsider.id,
      start_at: iso(start),
      end_at: iso(new Date(start.getTime() + 3600_000)),
    });
    expect(res.error).not.toBeNull();
  });

  it("a client cannot book on someone else's behalf", async () => {
    const start = nextWeekdayAt(4, 11);
    const res = await outsider.client.from("bookings").insert({
      trainer_id: trainer.id,
      client_id: client.id,
      start_at: iso(start),
      end_at: iso(new Date(start.getTime() + 3600_000)),
    });
    expect(res.error).not.toBeNull();
  });

  describe("recurring series", () => {
    let seriesId: string;
    let occurrenceIds: string[] = [];

    it("trainer creates a series for their own client and materializes occurrences", async () => {
      const first = nextWeekdayAt(5, 18);
      const series = await trainer.client
        .from("booking_series")
        .insert({
          trainer_id: trainer.id,
          client_id: client.id,
          day_of_week: 5,
          start_time: "18:00:00",
          end_time: "19:00:00",
          start_date: first.toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      expect(series.error).toBeNull();
      seriesId = series.data!.id;

      for (let w = 0; w < 4; w++) {
        const s = new Date(first.getTime() + w * 7 * 86400_000);
        const { data, error } = await trainer.client
          .from("bookings")
          .insert({
            trainer_id: trainer.id,
            client_id: client.id,
            start_at: iso(s),
            end_at: iso(new Date(s.getTime() + 3600_000)),
            series_id: seriesId,
          })
          .select("id")
          .single();
        expect(error).toBeNull();
        occurrenceIds.push(data!.id);
      }
      expect(occurrenceIds).toHaveLength(4);
    });

    it("trainer cannot create a series for a client that is not theirs", async () => {
      const res = await trainer.client.from("booking_series").insert({
        trainer_id: trainer.id,
        client_id: outsider.id,
        day_of_week: 5,
        start_time: "18:00:00",
        end_time: "19:00:00",
        start_date: new Date().toISOString().slice(0, 10),
      });
      expect(res.error).not.toBeNull();
    });

    it("client sees the series read-only and cannot cancel it", async () => {
      const read = await client.client.from("booking_series").select("id, status").eq("id", seriesId);
      expect(read.data).toHaveLength(1);

      const write = await client.client
        .from("booking_series")
        .update({ status: "cancelled" })
        .eq("id", seriesId);
      // RLS gives clients no UPDATE path: either an error or zero rows changed
      const still = await admin.from("booking_series").select("status").eq("id", seriesId).single();
      expect(write.error !== null || still.data!.status === "active").toBe(true);
      expect(still.data!.status).toBe("active");
    });

    it("cancelling a single occurrence leaves the rest of the series booked", async () => {
      const target = occurrenceIds[0];
      const res = await trainer.client
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", target);
      expect(res.error).toBeNull();

      const rows = await admin
        .from("bookings")
        .select("id, status")
        .eq("series_id", seriesId)
        .order("start_at");
      expect(rows.data!.filter((r) => r.status === "cancelled")).toHaveLength(1);
      expect(rows.data!.filter((r) => r.status === "booked")).toHaveLength(3);
    });

    it("cancelling the whole series marks it inactive and cancels future occurrences", async () => {
      const s = await trainer.client
        .from("booking_series")
        .update({ status: "cancelled" })
        .eq("id", seriesId);
      expect(s.error).toBeNull();

      const b = await trainer.client
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("series_id", seriesId)
        .eq("status", "booked")
        .gte("start_at", new Date().toISOString());
      expect(b.error).toBeNull();

      const rows = await admin.from("bookings").select("status").eq("series_id", seriesId);
      expect(rows.data!.every((r) => r.status === "cancelled")).toBe(true);
      const series = await admin.from("booking_series").select("status").eq("id", seriesId).single();
      expect(series.data!.status).toBe("cancelled");
    });
  });
});
