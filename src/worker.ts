import { Worker } from "@temporalio/worker";
import * as activities from "./activities";
import { NAMESPACE, TASK_QUEUE, WORKER_BUILD_ID } from "./utils";

async function run() {
    // Register workflows and activities with the worker
    // and connect to the temporal server
    const worker = await Worker.create({
        workflowsPath: require.resolve("./workflows/index"),
        activities,
        namespace: NAMESPACE,
        taskQueue: TASK_QUEUE,
        // buildId: WORKER_BUILD_ID,
        // useVersioning: true,
    });

    // Start the worker
    await worker.run();
};

run().catch((error) => {
    console.log(error);
    process.exit(1);
});