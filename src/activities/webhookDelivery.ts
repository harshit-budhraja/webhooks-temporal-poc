import * as _ from "lodash";
import { ActivityTaskError, TemporalActivityResponse, WebhookEvent, getSanitizedErrorString, simulateWebhookResponse } from "../utils";
import { HttpStatusCode } from "axios";
import { findAllDeliveryLogs } from "./db";

export async function callWebhook(event: WebhookEvent): Promise<TemporalActivityResponse> {
    const allLogs = await findAllDeliveryLogs();
    const deliveryLogRecord = _.filter(allLogs, (record: WebhookEvent) => record.xRequestId === event.xRequestId)[0];
    if (deliveryLogRecord?.deliveryStatus === "successful") {
        return {
            status: "success",
            data: event
        };
    }

    const response: {
        statusCode: HttpStatusCode
    } = await simulateWebhookResponse(event);

    if (response.statusCode === 200) {
        return {
            status: "success",
            data: response
        };
    }

    throw new ActivityTaskError(`Webhook responded with a status code ${response.statusCode}`);
}