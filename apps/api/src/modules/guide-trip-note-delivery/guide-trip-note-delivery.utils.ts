type GuideAssignmentInput = {
  guide: {
    id: string;
    leaderstepsAuthUserId: string | null;
  };
};

export type LinkedGuideRecipient = {
  guideId: string;
  authUserId: string;
};

export function resolveLinkedGuideRecipients(guideAssignments: GuideAssignmentInput[]): LinkedGuideRecipient[] {
  const recipients: LinkedGuideRecipient[] = [];
  const seen = new Set<string>();

  for (const assignment of guideAssignments) {
    const authUserId = assignment.guide.leaderstepsAuthUserId?.trim();
    if (!authUserId || seen.has(authUserId)) {
      continue;
    }
    seen.add(authUserId);
    recipients.push({
      guideId: assignment.guide.id,
      authUserId,
    });
  }

  return recipients;
}
