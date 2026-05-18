export const loggerConfig = {
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            translateTime: "SYS:standard"
          }
        }
      : undefined
};
