export const config = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || "mysecret",
  PG: {
    user: process.env.PG_USER || "postgres",
    host: process.env.PG_HOST || "localhost",
    database: process.env.PG_DATABASE || "salsa",
    password: process.env.PG_PASSWORD || "password",
    port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
  },
};
