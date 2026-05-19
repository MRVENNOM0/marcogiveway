export interface Giveaway {
  id: string;
  slug: string;
  title: string;
  description: string;
  redirectUrl: string;
  imageUrl?: string;
  endsAt: string;
  status: 'active' | 'ended';
  minParticipants?: number;
  createdAt: any;
  updatedAt?: any;
  entryCount?: number;
  winnerUsername?: string;
  winnerId?: string;
}

export interface Entry {
  id: string;
  giveawayId: string;
  discordUsername: string;
  joinedAt: any;
  userId?: string;
}
