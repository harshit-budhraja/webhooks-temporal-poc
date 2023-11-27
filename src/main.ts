// Imports
import { Connection, WorkflowClient } from '@temporalio/client';
import { NAMESPACE, TASK_QUEUE, WORKER_BUILD_ID, WebhookEvent } from './utils';
import { webhookDeliveryWorkflow } from './workflows/webhookDispatch';

async function main() {
    const connection = await Connection.connect();
    const client = new WorkflowClient({ connection, namespace: NAMESPACE });

    // await client.taskQueue.updateBuildIdCompatibility(TASK_QUEUE, {
    //     operation: "addNewIdInNewDefaultSet",
    //     buildId: WORKER_BUILD_ID
    // });

    const workflowPromises: any = [];

    for (let i = 1; i <= 5000; i++) {
        const event: WebhookEvent = {
            clientNumber: "random",
            xRequestId: i.toString(),
            webhookUrl: "https://example.com",
            payload: null,
            deliveryStatus: "queued",
        };

        // Create Webhook Delivery Events
        workflowPromises.push(
            client.start(webhookDeliveryWorkflow, {
                args: [event],
                taskQueue: TASK_QUEUE,
                workflowId: `${event.clientNumber}:${event.xRequestId}`
            })
        );
        console.log(`Creating webhook dispatch payload for xRequestId=${i.toString()}`);
    }

    console.log(`Awaiting response from Temporal for Workflow Creations`);
    const handles = await Promise.all(workflowPromises);
    handles.forEach((handle) => {
        console.log(`Created webhook dispatch event ${handle.workflowId} with RunID ${handle.firstExecutionRunId}`);
    });
}

main().catch((error) => {
    console.log(error);
    process.exit(1);
})