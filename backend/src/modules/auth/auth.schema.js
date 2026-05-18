export const registerBodySchema = {
  type: "object",
  required: ["email", "password", "tenantName"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8 },
    tenantName: { type: "string", minLength: 2 }
  }
};

export const loginBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8 }
  }
};
