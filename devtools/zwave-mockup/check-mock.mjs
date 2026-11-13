import { Driver } from "zwave-js";

const portPath = process.env.ZWAVE_MOCK_SERIAL ?? "tcp://127.0.0.1:5555";
const driver = new Driver(portPath, {
  logConfig: { enabled: true, level: "debug", logToFile: false },
});

let timeout;
const driverReady = new Promise((resolve, reject) => {
  timeout = setTimeout(
    () => reject(new Error("Timed out waiting for the Z-Wave JS driver to start")),
    120_000,
  );
  driver.once("driver ready", resolve);
  driver.on("error", reject);
});

try {
  await driver.start();
  await driverReady;

  const nodes = [...driver.controller.nodes.values()]
    .filter((node) => node.id !== driver.controller.ownNodeId)
    .map((node) => {
      const endpointZeroValues = node.getEndpoint(0)?.getDefinedValueIDs() ?? [];
      return {
        id: node.id,
        manufacturer: node.manufacturer,
        deviceConfigLabel: node.deviceConfig?.label,
        ready: node.status,
        hasRoomTemperatureValue: endpointZeroValues.some(
          (valueId) => valueId.commandClass === 49,
        ),
        hasWritableOffsetValue: endpointZeroValues.some(
          (valueId) => valueId.commandClass === 112 && valueId.property === 8,
        ),
        valueCount: endpointZeroValues.length,
      };
    });

  console.info(JSON.stringify(nodes, null, 2));
  if (nodes.length !== 2) {
    throw new Error(`Expected 2 mock thermostats, found ${nodes.length}`);
  }
  if (!nodes.some((node) => node.deviceConfigLabel?.includes("Spirit"))) {
    throw new Error("Z-Wave JS did not identify the Eurotronic Spirit node");
  }
  if (!nodes.some((node) => node.deviceConfigLabel?.includes("ZWA021"))) {
    throw new Error("Z-Wave JS did not identify the Aeotec ZWA021 node");
  }
  if (nodes.some((node) => !node.hasRoomTemperatureValue || !node.hasWritableOffsetValue)) {
    throw new Error("A mock thermostat is missing CC 49 or configuration parameter 8");
  }

  for (const node of driver.controller.nodes.values()) {
    if (node.id === driver.controller.ownNodeId) continue;
    await node.getEndpoint(0).invokeCCAPI(49, "sendReport", 1, 0, 21.25);
  }
  console.info("Sent a CC 49 Air Temperature report to each mock thermostat");
} finally {
  clearTimeout(timeout);
  await driver.destroy();
}
