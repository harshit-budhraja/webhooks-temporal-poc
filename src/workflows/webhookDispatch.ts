import * as _ from "lodash";
import { ApplicationFailure, proxyActivities } from "@temporalio/workflow";
import { ActivityTaskError, TemporalActivityResponse, TemporalActivityStatus, WebhookEvent, WebhookEventStatus, getSanitizedErrorString } from "../utils";
import * as WebhookActivities from "../activities/webhookDelivery";
import * as DbActivities from "../activities/db";
import { HttpStatusCode } from "axios";

export async function webhookDeliveryWorkflow(event: WebhookEvent): Promise<TemporalActivityResponse> {
    const responseDataState: {
        createDeliveryLog?: any,
        callWebhook?: any,
        upsertDeliveryLog?: any,
    } = {
        createDeliveryLog: {},
        callWebhook: {},
        upsertDeliveryLog: {},
    };

    let deliveryLogStatus: {
        deliveryStatus?: WebhookEventStatus,
        responseStatusCode?: HttpStatusCode
    };

    // Get the activity for the workflow and set up the activity options
    const { createDeliveryLog, upsertDeliveryLog } = proxyActivities<typeof DbActivities>({
        // RetryPolicy specifies how to automatically handle retries if an Activity fails.
        retry: {
            initialInterval: '1 second',
            maximumInterval: '1 second',
            backoffCoefficient: 1,
            maximumAttempts: 10,
            nonRetryableErrorTypes: [],
        },
        startToCloseTimeout: '15 seconds',
    });

    const { callWebhook } = proxyActivities<typeof WebhookActivities>({
        // RetryPolicy specifies how to automatically handle retries if an Activity fails.
        retry: {
            initialInterval: '1 second',
            maximumInterval: '27 seconds',
            backoffCoefficient: 3,
            maximumAttempts: 7,
            nonRetryableErrorTypes: [],
        },
        startToCloseTimeout: '15 seconds',
    });

    // Add an entry in the DB for this dispatch event
    try {
        const activityResponse: TemporalActivityResponse = await createDeliveryLog(event);
        responseDataState.createDeliveryLog = activityResponse;

        if (activityResponse.status === "failure") {
            throw activityResponse;
        }
    } catch (error) {
        responseDataState.createDeliveryLog.error = {
            text: "Creation of delivery log failed",
            message: getSanitizedErrorString(error)
        };

        throw new ActivityTaskError(`Creation of delivery log failed: ${getSanitizedErrorString(error)}`);
    }

    // Execute the webhook call
    try {
        const activityResponse: TemporalActivityResponse = await callWebhook(event);
        responseDataState.callWebhook = activityResponse;

        if (activityResponse.status === "failure") {
            throw activityResponse;
        }

        deliveryLogStatus = {
            deliveryStatus: "successful",
            responseStatusCode: 200
        }

    } catch (error) {
        responseDataState.callWebhook.error = {
            text: "Webhook call failed",
            message: getSanitizedErrorString(error)
        };

        deliveryLogStatus = {
            deliveryStatus: "failed",
            responseStatusCode: 502
        };

        throw new ActivityTaskError(`Webhook call failed: ${getSanitizedErrorString(error)}`);
    }

    // Update DB entry for the dispatch event
    try {
        const updatedEventPayload = _.cloneDeep(event);

        updatedEventPayload.deliveryStatus = deliveryLogStatus.deliveryStatus!;
        updatedEventPayload.responseStatusCode = deliveryLogStatus.responseStatusCode;

        const activityResponse: TemporalActivityResponse = await upsertDeliveryLog(updatedEventPayload, {
            where: {
                xRequestId: event.xRequestId
            }
        });
        responseDataState.upsertDeliveryLog = activityResponse;

        if (activityResponse.status === "failure") {
            throw activityResponse;
        }
    } catch (error) {
        responseDataState.upsertDeliveryLog.error = {
            text: "Update DB record failed",
            message: getSanitizedErrorString(error)
        };

        throw new ActivityTaskError(`Upsert DB record failed: ${getSanitizedErrorString(error)}`);
    }

    const error: any = responseDataState?.createDeliveryLog?.error ||
        responseDataState?.callWebhook?.error || responseDataState?.upsertDeliveryLog?.error;
    if (error) {
        throw new ApplicationFailure(`Workflow Error: ${getSanitizedErrorString(error)}`);
    }

    return {
        status: "success",
        data: responseDataState
    };
}