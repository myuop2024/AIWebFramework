import { db } from "../db"; // Assuming db export from drizzle connection setup
import { users, userPoints, badges, userBadges } from "../../shared/schema";
import { eq, sql, desc, and } from "drizzle-orm";

// Define types for actions and badge criteria (can be expanded)
export type GamificationAction =
  | "TRAINING_MODULE_COMPLETED"
  | "REPORT_SUBMITTED"
  | "REPORT_VERIFIED"
  | "DAILY_LOGIN"
  | "PROFILE_COMPLETED"
  | "POLL_PARTICIPATED";

// Placeholder for points configuration - this could be more dynamic later
const ACTION_POINTS: Record<GamificationAction, number> = {
  TRAINING_MODULE_COMPLETED: 50,
  REPORT_SUBMITTED: 20,
  REPORT_VERIFIED: 30, // Additional points
  DAILY_LOGIN: 5,
  PROFILE_COMPLETED: 25,
  POLL_PARTICIPATED: 10,
};

export class GamificationService {
  constructor(private readonly dbInstance = db) {}

  async recordAction(userId: number, action: GamificationAction, actionDetailsId?: number): Promise<void> {
    const pointsToAward = ACTION_POINTS[action];
    if (!pointsToAward) {
      console.warn(`No points defined for action: ${action}`);
      return;
    }

    try {
      // Record the points
      await this.dbInstance.insert(userPoints).values({
        userId,
        pointsEarned: pointsToAward,
        actionType: action,
        actionDetailsId,
      });

      // Update total points on the users table
      await this.dbInstance.update(users)
        .set({ totalGamificationPoints: sql`${users.totalGamificationPoints} + ${pointsToAward}` })
        .where(eq(users.id, userId));

      console.log(`Awarded ${pointsToAward} points to user ${userId} for action ${action}`);

      // Check for new badges after awarding points (implementation to be added)
      await this.checkAndAwardBadges(userId, action);

      // Update leaderboards (implementation to be added)
      await this.updateLeaderboards(userId, pointsToAward);

    } catch (error) {
      console.error(`Error recording action for user ${userId}:`, error);
      // Rethrow or handle as appropriate for your error strategy
      throw error;
    }
  }

  async checkAndAwardBadges(userId: number, triggeringAction?: GamificationAction): Promise<void> {
    // TODO: Implement badge checking logic
    // 1. Get all badges the user hasn't earned yet.
    // 2. Get user's relevant stats (total points, reports submitted, training completed, etc.).
    // 3. Iterate through unearned badges and check if criteria are met.
    // 4. If criteria met, insert into userBadges table.
    console.log(`Checking badges for user ${userId} after action: ${triggeringAction}`);
    // Example: Fetch all badges not yet earned by the user
    // const earnedBadgeIds = await this.dbInstance.select({ id: userBadges.badgeId }).where(eq(userBadges.userId, userId));
    // const potentialBadges = await this.dbInstance.select().from(badges).where(notInArray(badges.id, earnedBadgeIds.map(b => b.id)));
    // ... more logic needed here based on badge criteria
  }

  async updateLeaderboards(userId: number, pointsAwarded: number): Promise<void> {
    // For now, leaderboard updates are handled by the views we created
    // In a production system, this would trigger recalculation of leaderboard entries
    console.log(`Leaderboard update triggered for user ${userId} with ${pointsAwarded} points`);
    
    // TODO: Implement actual leaderboard entry updates based on current scoring system
    // This would involve updating the leaderboard_entries table with new scores
  }

  async getUserProfile(userId: number): Promise<any> {
     // TODO: Fetch user's points, badges, rank, etc.
     const points = await this.dbInstance.select({ totalPoints: users.totalGamificationPoints })
         .from(users)
         .where(eq(users.id, userId))
         .limit(1);

     const earnedBadges = await this.dbInstance.select({
             badgeName: badges.name,
             badgeDescription: badges.description,
             badgeIconUrl: badges.iconUrl,
             earnedAt: userBadges.earnedAt
         })
         .from(userBadges)
         .innerJoin(badges, eq(userBadges.badgeId, badges.id))
         .where(eq(userBadges.userId, userId))
         .orderBy(desc(userBadges.earnedAt));

     // Placeholder for rank
     return {
         totalPoints: points[0]?.totalPoints || 0,
         badges: earnedBadges,
         rankOverall: null, // To be implemented
         rankWeekly: null, // To be implemented
     };
  }

  async getLeaderboard(type: 'weekly' | 'overall', limit: number = 10): Promise<any[]> {
     // Use raw SQL to query the views we created
     try {
       if (type === 'weekly') {
         const result = await this.dbInstance.execute(sql`
           SELECT user_id as "userId", score as points, rank, first_name as "firstName", last_name as "lastName", calculated_at as "calculatedAt"
           FROM leaderboard_weekly
           ORDER BY rank
           LIMIT ${limit}
         `);
         return result.rows;
       } else {
         const result = await this.dbInstance.execute(sql`
           SELECT user_id as "userId", score as points, rank, first_name as "firstName", last_name as "lastName", calculated_at as "calculatedAt"
           FROM leaderboard_overall
           ORDER BY rank
           LIMIT ${limit}
         `);
         return result.rows;
       }
     } catch (error) {
       console.error(`Error fetching ${type} leaderboard:`, error);
       return [];
     }
  }
}

export const gamificationService = new GamificationService();
