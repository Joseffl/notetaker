import { prisma } from "./db";

interface PlanLimits {
  meetings: number;
  chatMessages: number;
}

const PERSONAL_LIMITS: PlanLimits = {
  meetings: -1,
  chatMessages: -1,
};

export async function canUserSendBot(_userId: string) {
  return { allowed: true };
}

export async function canUserChat(_userId: string) {
  return { allowed: true };
}

export async function incrementMeetingUsage(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      meetingsThisMonth: { increment: 1 },
    },
  });
}

export async function incrementChatUsage(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      chatMessagesToday: { increment: 1 },
    },
  });
}

export function getPlanLimits(_plan: string): PlanLimits {
  return PERSONAL_LIMITS;
}
