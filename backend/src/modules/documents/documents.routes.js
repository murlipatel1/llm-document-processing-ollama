import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { tenantScope } from "../../middleware/tenantScope.js";
import {
  createDocumentHandler,
  deleteDocumentHandler,
  downloadDocumentHandler,
  getDocumentHandler,
  listDocumentsHandler,
  previewDocumentHandler,
  reprocessDocumentHandler
} from "./documents.controller.js";

export async function documentsRoutes(fastify) {
  fastify.get("/", { preHandler: [authenticate, tenantScope] }, listDocumentsHandler.bind(fastify));

  fastify.get("/:id", { preHandler: [authenticate, tenantScope] }, getDocumentHandler.bind(fastify));

  fastify.post(
    "/",
    { preHandler: [authenticate, tenantScope, authorize("EDITOR")] },
    createDocumentHandler.bind(fastify)
  );

  fastify.delete(
    "/:id",
    { preHandler: [authenticate, tenantScope, authorize("EDITOR")] },
    deleteDocumentHandler.bind(fastify)
  );

  fastify.post(
    "/:id/reprocess",
    { preHandler: [authenticate, tenantScope] },
    reprocessDocumentHandler.bind(fastify)
  );

  fastify.get(
    "/:id/download",
    { preHandler: [authenticate, tenantScope] },
    downloadDocumentHandler.bind(fastify)
  );

  fastify.get(
    "/:id/preview",
    { preHandler: [authenticate, tenantScope] },
    previewDocumentHandler.bind(fastify)
  );
}
