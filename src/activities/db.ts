import { HttpStatusCode } from "axios";
import { DELIVERY_LOGS, TemporalActivityResponse, WebhookEvent, WebhookEventStatus, getSanitizedErrorString } from "../utils";

export async function createDeliveryLog(event: WebhookEvent): Promise<TemporalActivityResponse> {
    try {
        DELIVERY_LOGS.push(event);

        return {
            status: "success",
            data: event
        };
    } catch (error) {
        return {
            status: "failure",
            error: getSanitizedErrorString(error)
        };
    }
}

export async function upsertDeliveryLog(data: WebhookEvent, condition: {
    where?: {
        xRequestId: string;
    }
} = {}): Promise<TemporalActivityResponse> {
    try {
        const recordIndex: number | null = DELIVERY_LOGS.findIndex((record: WebhookEvent) => {
            let isMatching: boolean = false;

            if (condition.where?.xRequestId && condition.where?.xRequestId === record.xRequestId) {
                isMatching = true;
            }

            return isMatching;
        });

        if (recordIndex === -1) {
            const deliveryLog: WebhookEvent = (await createDeliveryLog(data)).data;

            return {
                status: "success",
                data: deliveryLog
            };
        }

        if (data.deliveryStatus) {
            DELIVERY_LOGS[recordIndex].deliveryStatus = data.deliveryStatus;
        }

        if (data.responseStatusCode) {
            DELIVERY_LOGS[recordIndex].responseStatusCode = data.responseStatusCode;
        }

        return {
            status: "success",
            data: DELIVERY_LOGS[recordIndex]
        };
    } catch (error) {
        return {
            status: "failure",
            error: getSanitizedErrorString(error)
        };
    }
}

export async function findAllDeliveryLogs(): Promise<Array<WebhookEvent>> {
    return DELIVERY_LOGS;
}