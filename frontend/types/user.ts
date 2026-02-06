export interface UserSettings {
  theme?: string;
  language?: string;
  notifications?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  settings: UserSettings;
}
