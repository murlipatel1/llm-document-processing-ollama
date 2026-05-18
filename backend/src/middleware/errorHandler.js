export function errorHandler(error, request, reply) {
  request.log.error(error);

  if (error.validation) {
    return reply.status(400).send({
      message: "Validation error",
      details: error.validation
    });
  }

  return reply.status(error.statusCode || 500).send({
    message: error.message || "Internal server error"
  });
}
