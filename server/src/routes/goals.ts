import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { GoalModel, Types } from "../db/mongoose";
import { todayBR } from "../db/index";

interface CreateGoalBody {
  title: string;
  description?: string;
  target_date?: string;
}

interface UpdateGoalBody {
  title?: string;
  description?: string;
  target_date?: string;
  status?: string;
}

interface AddMilestoneBody {
  title: string;
}

@Controller("api/goals")
export class GoalsController {
  @Get()
  async getGoals() {
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
  }

  @Post()
  async createGoal(@Body() body: CreateGoalBody) {
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
  }

  @Patch(":id")
  async updateGoal(@Param("id") id: string, @Body() body: UpdateGoalBody) {
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      updates.title = body.title;
    }

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    if (body.target_date !== undefined) {
      updates.target_date = body.target_date;
    }

    if (body.status !== undefined) {
      updates.status = body.status;
    }

    if (Object.keys(updates).length > 0) {
      await GoalModel.updateOne({ _id: id }, { $set: updates });
    }

    return { ok: true };
  }

  @Delete(":id")
  async deleteGoal(@Param("id") id: string) {
    await GoalModel.findByIdAndDelete(id);
    return { ok: true };
  }

  @Post(":id/milestones")
  async addMilestone(@Param("id") id: string, @Body() body: AddMilestoneBody) {
    const goal = await GoalModel.findById(id, "milestones").lean();
    const position = (goal?.milestones ?? []).length;

    const milestoneId = new Types.ObjectId();
    const newMilestone = {
      _id: milestoneId,
      title: body.title,
      completed_at: null,
      position,
    };

    await GoalModel.updateOne({ _id: id }, { $push: { milestones: newMilestone } });

    return {
      id: milestoneId.toString(),
      goal_id: id,
      title: body.title,
      completed_at: null,
      position,
    };
  }

  @Patch(":id/milestones/:milestoneId")
  async toggleMilestone(@Param("id") id: string, @Param("milestoneId") milestoneId: string) {
    const mid = new Types.ObjectId(milestoneId);

    const goal = await GoalModel.findOne({ _id: id, "milestones._id": mid }, { "milestones.$": 1 }).lean();

    const milestone = goal?.milestones?.[0];
    const newCompleted = milestone?.completed_at ? null : new Date().toISOString();

    await GoalModel.updateOne(
      { _id: id, "milestones._id": mid },
      { $set: { "milestones.$.completed_at": newCompleted } } as never
    );

    return { ok: true };
  }

  @Delete(":id/milestones/:milestoneId")
  async deleteMilestone(@Param("id") id: string, @Param("milestoneId") milestoneId: string) {
    await GoalModel.updateOne(
      { _id: id },
      { $pull: { milestones: { _id: new Types.ObjectId(milestoneId) } } }
    );

    return { ok: true };
  }
}
