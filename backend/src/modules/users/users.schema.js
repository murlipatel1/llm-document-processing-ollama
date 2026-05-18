export const listUsersResponseSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
          createdAt: { type: "string" }
        }
      }
    }
  }
};
