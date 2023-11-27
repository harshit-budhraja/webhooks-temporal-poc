import * as _ from "lodash";
import { HttpStatusCode } from "axios";

export const WORKER_BUILD_ID = "1.0.0";
export const NAMESPACE = "default";
export const TASK_QUEUE = "webhookDelivery";
export const DELIVERY_LOGS: Array<WebhookEvent> = [];
export const getSanitizedErrorString = (error: any) => JSON.stringify(error, Object.getOwnPropertyNames(error));

export type TemporalActivityStatus = "success" | "failure";
export type WebhookEventStatus = "queued" | "successful" | "failed" | "sink";
export type WebhookEvent = {
    clientNumber: string;
    xRequestId: string;
    webhookUrl: string;
    payload: any;
    webhookSecret?: string;
    deliveryStatus: WebhookEventStatus;
    responseStatusCode?: HttpStatusCode;
};
export type TemporalActivityResponse = {
    status: TemporalActivityStatus;
    data?: any;
    error?: string;
}

export class ActivityTaskError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = "ActivityTaskError";
        this.stack = (<any> new Error()).stack;
    }
}

export async function simulateWebhookResponse(event: WebhookEvent, resolveAs: "success" | "failure" | null = null): Promise<{
    statusCode: HttpStatusCode
}> {
    return new Promise((resolve, reject) => {
        if (resolveAs !== null) {
            console.log(`simulateWebhookResponse: Got resolveAs=${resolveAs}`);
            if (resolveAs === "success") {
                console.log(`simulateWebhookResponse: Resolving with 200`);
                return resolve({
                    statusCode: 200
                });
            }

            console.log(`simulateWebhookResponse: Rejecting with 502`);
            return reject({
                statusCode: 502
            });
        }

        if (_.toInteger(event.xRequestId) % 2 === 0) {
            console.log(`simulateWebhookResponse: Resolving with 200`);
            return resolve({
                statusCode: 200
            });
        }

        console.log(`simulateWebhookResponse: Rejecting with 502`);
        return reject({
            statusCode: 502
        });
    })
}