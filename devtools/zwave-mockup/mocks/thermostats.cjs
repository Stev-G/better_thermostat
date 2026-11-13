const CONFIGURATION_CC = 112;
const MANUFACTURER_SPECIFIC_CC = 114;
const MULTILEVEL_SENSOR_CC = 49;
const THERMOSTAT_MODE_CC = 64;
const THERMOSTAT_SETPOINT_CC = 67;

function commandClass(ccId, version, extra = {}) {
  return { ccId, version, isSupported: true, ...extra };
}

function configurationCapabilities() {
  return commandClass(CONFIGURATION_CC, 4, {
    parameters: [
      {
        "#": 5,
        valueSize: 1,
        name: "Temperature Report Threshold",
        minValue: 0,
        maxValue: 50,
        defaultValue: 5,
        readonly: false,
      },
      {
        "#": 8,
        valueSize: 1,
        name: "Temperature Offset",
        minValue: -128,
        maxValue: 50,
        defaultValue: 0,
        readonly: false,
      },
    ],
  });
}

function thermostatCapabilities({ id, manufacturerId, productType, productId, name }) {
  return {
    id,
    behaviors: [
      {
        transformIncomingCC(_controller, node, cc) {
          if (cc.ccId === MULTILEVEL_SENSOR_CC && cc.ccCommand === 5) {
            const report =
              typeof cc.toLogEntry === "function"
                ? cc.toLogEntry()
                : { ccId: cc.ccId, ccCommand: cc.ccCommand };
            console.info(
              `[${name} node ${node.id}] received Sensor Multilevel Report: ${JSON.stringify(report)}`,
            );
          }
          return cc;
        },
      },
    ],
    capabilities: {
      manufacturerId,
      productType,
      productId,
      firmwareVersion: "1.0",
      isListening: true,
      isFrequentListening: false,
      isRouting: true,
      supportsBeaming: true,
      genericDeviceClass: 8,
      specificDeviceClass: 1,
      txDelay: 0,
      commandClasses: [
        commandClass(94, 2),
        commandClass(133, 2),
        commandClass(89, 1),
        commandClass(128, 1),
        configurationCapabilities(),
        commandClass(MANUFACTURER_SPECIFIC_CC, 2),
        commandClass(113, 8, {
          supportsV1Alarm: false,
          notificationTypesAndEvents: {},
        }),
        commandClass(117, 2),
        commandClass(134, 2),
        commandClass(64, 3, {
          supportedModes: [0, 1, 11, 15, 31],
        }),
        commandClass(THERMOSTAT_SETPOINT_CC, 3, {
          setpoints: {
            "1": { scale: "°C", minValue: 8, maxValue: 28, defaultValue: 20 },
            "11": { scale: "°C", minValue: 8, maxValue: 28, defaultValue: 18 },
          },
        }),
        commandClass(MULTILEVEL_SENSOR_CC, 5, {
          isControlled: true,
          sensors: { "1": { supportedScales: [0] } },
          getValue: () => 20.5,
        }),
        commandClass(38, 3, { primarySwitchType: 0 }),
      ],
    },
  };
}

module.exports.default = {
  nodes: [
    // Matches zwave-js 15.31.2's Spirit product fingerprint 0x0148:0x0003:0x0001.
    thermostatCapabilities({
      id: 2,
      manufacturerId: 0x0148,
      productType: 0x0003,
      productId: 0x0001,
      name: "Eurotronic Spirit Z",
    }),
    // Matches zwave-js 15.31.2's Aeotec ZWA021 EU fingerprint 0x0371:0x0002:0x0015.
    thermostatCapabilities({
      id: 3,
      manufacturerId: 0x0371,
      productType: 0x0002,
      productId: 0x0015,
      name: "Aeotec ZWA021",
    }),
  ],
};
