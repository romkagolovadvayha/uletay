export function loadDbEnv(): void;

export function getDbConfig(): {
  host: string;
  database: string;
  user: string;
  password: string;
};
