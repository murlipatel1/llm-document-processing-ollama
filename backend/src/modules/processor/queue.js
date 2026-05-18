import { Queue } from "bullmq";
import { QUEUES } from "../../config/constants.js";

export function createDocumentQueue(connection) {
  return new Queue(QUEUES.DOCUMENT_PROCESSING, { connection });
}
