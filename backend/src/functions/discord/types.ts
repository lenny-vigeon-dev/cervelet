export interface DiscordInteraction {
  type: number;
  token?: string;
  id?: string;
  data?: {
    name: string;
    options?: any[];
  };
}

