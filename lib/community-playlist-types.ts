export type PlaylistOwner = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type CommunityPlaylist = {
  id: string;
  title: string;
  description: string;
  trackIds: string[];
  owner: PlaylistOwner;
  createdAt: number;
  updatedAt: number;
  stars: string[];
  plays: number;
  clicks: number;
};

export type CommunityPlaylistSummary = Omit<CommunityPlaylist, "stars"> & {
  starCount: number;
  score: number;
};

export type CommunityPlaylistInput = {
  id?: string;
  title: string;
  description?: string;
  trackIds: string[];
  owner: PlaylistOwner;
};
