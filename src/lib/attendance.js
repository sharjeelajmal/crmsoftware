import { ObjectId } from "mongodb";
import { badRequest } from "@/lib/api";
import { dayNoon } from "@/lib/dates";
import { cutFor } from "@/constants/attendance";

/**
 * Attendance — server helpers. Collection `attendance`: one document per worker per day
 * `{ workerId, workerName, day: "yyyy-mm-dd", date (noon of the day), status, rate, cut, by, createdAt, updatedAt }`.
 * The rate is the worker's per-day salary when the mark is saved. The rules live in src/constants/attendance.js.
 */

export const ATTENDANCE = "attendance";

const WORKER_FIELDS = { name: 1, type: 1, dailyRate: 1, active: 1 };

export const loadWorkers = (db) => db.collection("workers").find({}, { projection: WORKER_FIELDS }).toArray();

export const dayMarks = (db, day) => db.collection(ATTENDANCE).find({ day }).toArray();

export const monthMarks = (db, days) =>
  days.length
    ? db
        .collection(ATTENDANCE)
        .find({ day: { $gte: days[0], $lte: days[days.length - 1] } })
        .toArray()
    : [];

/**
 * Saves the marks of one day: each `{ workerId, status }` is set (or cleared when status is ""). Every worker must
 * exist; the cut is snapshotted from the worker's per-day salary.
 */
export async function saveMarks(db, { day, marks, session, now = new Date() }) {
  const ids = marks.map((mark) => new ObjectId(mark.workerId));
  const workers = await db
    .collection("workers")
    .find({ _id: { $in: ids } }, { projection: WORKER_FIELDS })
    .toArray();
  const byId = new Map(workers.map((worker) => [String(worker._id), worker]));
  const missing = marks.find((mark) => !byId.has(mark.workerId));
  if (missing) throw badRequest("Worker not found");

  const date = dayNoon(day);
  const by = { id: session?.sub ?? null, name: session?.name ?? "" };
  const operations = marks.map(({ workerId, status }) => {
    const worker = byId.get(workerId);
    const filter = { workerId: worker._id, day };
    if (!status) return { deleteOne: { filter } };
    const rate = Number(worker.dailyRate) || 0;
    return {
      updateOne: {
        filter,
        update: {
          $set: { workerName: worker.name, date, status, rate, cut: cutFor(status, rate), by, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    };
  });
  await db.collection(ATTENDANCE).bulkWrite(operations, { ordered: false });
}
