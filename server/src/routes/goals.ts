import { Elysia, t } from "elysia";
import { GoalModel, Types } from "../db/mongoose.js";
import { todayBR } from "../db/index.js";

export const goalsRoutes = new Elysia()
  // List all goals with milestones
  .get("/api/goals", async () => {
    const goals = await GoalModel.find().sort({ created_at: -1 }).lean();

    return goals.map((g) => {
      const milestones = (g.milestones ?? []).map((m) => ({
        id: m._id.toString(),
        goal_id: g._id.toString(),
        title: m.title,
        completed_at: m.completed_at ?? null,
        position: m.position,
      }));

      const total = milestones.length;
      const done = milestones.filter((m) => m.completed_at).length;

      return {
        id: g._id.toString(),
        title: g.title,
        description: g.description ?? null,
        target_date: g.target_date ?? null,
        status: g.status ?? "active",
        created_at: g.created_at,
        milestones,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });
  })

  // Create goal
  .post(
    "/api/goals",
    async ({ body }) => {
      const { title, description, target_date } = body;
      const created_at = todayBR();
      const doc = {
        title,
        description: description ?? null,
        target_date: target_date ?? null,
        status: "active",
        created_at,
        milestones: [],
      };
      const result = await GoalModel.create(doc);
      return {
        id: result._id.toString(),
        title,
        description: description ?? null,
        target_date: target_date ?? null,
        status: "active",
        created_at,
        milestones: [],
        progress: 0,
      };
    },
    {
      body: t.Object({
        title: t.String(),
        description: t.Optional(t.String()),
        target_date: t.Optional(t.String()),
      }),
    }
  )

  // Update goal (status, title, etc.)
  .patch(
    "/api/goals/:id",
    async ({ params, body }) => {
      const updates: Record<string, unknown> = {};
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.target_date !== undefined) updates.target_date = body.target_date;
      if (body.status !== undefined) updates.status = body.status;
      if (Object.keys(updates).length > 0) {
        await GoalModel.updateOne({ _id: params.id }, { $set: updates });
      }
      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String()),
        description: t.Optional(t.String()),
        target_date: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  )

  // Delete goal
  .delete(
    "/api/goals/:id",
    async ({ params }) => {
      await GoalModel.findByIdAndDelete(params.id);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Add milestone
  .post(
    "/api/goals/:id/milestones",
    async ({ params, body }) => {
      const goal = await GoalModel.findById(params.id, "milestones").lean();
      const position = (goal?.milestones ?? []).length;
      const milestoneId = new Types.ObjectId();
      const newMilestone = {
        _id: milestoneId,
        title: body.title,
        completed_at: null,
        position,
      };

      await GoalModel.updateOne(
        { _id: params.id },
        { $push: { milestones: newMilestone } }
      );

      return {
        id: milestoneId.toString(),
        goal_id: params.id,
        title: body.title,
        completed_at: null,
        position,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ title: t.String() }),
    }
  )

  // Toggle milestone completion
  .patch(
    "/api/goals/:id/milestones/:milestoneId",
    async ({ params }) => {
      const mid = new Types.ObjectId(params.milestoneId);
      const goal = await GoalModel.findOne(
        { _id: params.id, "milestones._id": mid },
        { "milestones.$": 1 }
      ).lean();

      const milestone = goal?.milestones?.[0];
      const newCompleted = milestone?.completed_at ? null : new Date().toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await GoalModel.updateOne(
        { _id: params.id, "milestones._id": mid },
        { $set: { "milestones.$.completed_at": newCompleted } } as any
      );

      return { ok: true };
    },
    { params: t.Object({ id: t.String(), milestoneId: t.String() }) }
  )

  // Delete milestone
  .delete(
    "/api/goals/:id/milestones/:milestoneId",
    async ({ params }) => {
      await GoalModel.updateOne(
        { _id: params.id },
        { $pull: { milestones: { _id: new Types.ObjectId(params.milestoneId) } } }
      );
      return { ok: true };
    },
    { params: t.Object({ id: t.String(), milestoneId: t.String() }) }
  );
