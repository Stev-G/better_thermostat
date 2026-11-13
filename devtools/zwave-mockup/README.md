# Z-Wave thermostat mock network

This dev tool starts a Z-Wave JS mock controller with two always-awake mock
nodes, using the Spirit and ZWA021 product fingerprints from the Z-Wave JS
15.31.2 device database. Each node advertises Thermostat Mode, Thermostat
Setpoint, Configuration and Sensor Multilevel CCs. Configuration parameter 8
is writable and includes the external-temperature selector `-128`. Sensor
Multilevel Air Temperature is exposed in Celsius.

The mock logs incoming Sensor Multilevel Reports so a developer can confirm
that Better Thermostat's `sendReport` call reached the simulated thermostat.
The nodes are deliberately always awake to keep the first integration check
focused on discovery and CC behavior rather than battery wake-up timing.

## Start the complete system in the VS Code Dev Container

The mock, Z-Wave JS UI and Home Assistant all run as processes in the same Dev
Container. No Docker daemon on the host is needed, and the processes connect
to one another through `127.0.0.1`.

### 1. Open the development container

Open the repository in VS Code and choose **Reopen in Container**. Wait for
the container build and `scripts/setup` to finish. The container provides
Node.js 22 and forwards Home Assistant port `9123`, Z-Wave JS UI port `8091`,
and the Z-Wave JS WebSocket port `3000`. If it was already running before
those ports were added, reopen it or forward the ports from VS Code's Ports
view.

### 2. Start the mock server

In the first VS Code terminal:

```sh
cd /workspaces/better_thermostat/devtools/zwave-mockup
npm ci
npm start
```

Wait for `Server listening on tcp://0.0.0.0:5555` and leave this terminal
running. `npm ci` is only needed after a fresh checkout or when dependencies
change.

### 3. Install and start Z-Wave JS UI

In a second VS Code terminal, install the UI once in the container, then start
it with a persistent store in the workspace:

```sh
npm install -g zwave-js-ui@11.23.0
mkdir -p /workspaces/better_thermostat/.zwave-js-ui-store
STORE_DIR=/workspaces/better_thermostat/.zwave-js-ui-store zwave-js-ui
```

The store directory holds Z-Wave JS UI runtime data and its session secret. It
is local-only and ignored by Git. Open the forwarded port `8091` in VS Code.
If startup reports that port `8091` is already in use, reuse the Z-Wave JS UI
process that is already running instead of starting a second copy.
In Z-Wave JS UI settings, set **Serial Port** to
`tcp://127.0.0.1:5555`, then enable its Home Assistant WebSocket server on
port `3000`. Confirm the UI connects to the mock and finishes interviewing
both nodes. Leave this terminal running too.

### 4. Start Home Assistant

In VS Code, open **Terminal → Run Task…** and select **Run Home Assistant on
port 9123**. This runs `scripts/start`; wait for Home Assistant to finish
starting, then open the forwarded port `9123` and complete any initial setup.
The task can also be started in a third terminal with:

```sh
scripts/start
```

Add Home Assistant's native **Z-Wave** integration and connect it to
`ws://127.0.0.1:3000`. The mock nodes should then appear as the Spirit and
ZWA021 devices. Enable their disabled offset number entities in Home
Assistant if necessary.

### 5. Configure Better Thermostat

Add the mock climate entity or entities to a Better Thermostat entry and
select the room-temperature sensor. There is no Better Thermostat option to
enable external temperature. For a Spirit/ZWA021, set its local offset number
to the device's reserved value `-128` yourself before adding it. Better
Thermostat then preselects `no_calibration` for that new TRV. If it was already
added, choose `no_calibration` in its settings. The quirk sends room
temperature as a Sensor Multilevel (CC 49) report only when Home Assistant
publishes `-128` among that number entity's `reserved_values`, calibration is
off, and the TRV is not in direct-valve mode. It never writes or restores the
offset.

The accepted room-temperature readings and the 30-minute keepalive use the
same report path. Confirm the result in the mock terminal, which logs incoming
CC 49 reports for Spirit node 2 and ZWA021 node 3.

The combination exercised on 2026-11-13 was Node.js 22.23.5, Z-Wave JS UI
11.23.0 (driver 15.28.0), and this mock's Z-Wave JS 15.31.2. HA discovered
both mock thermostats and the mock logged reports to both nodes. npm printed
a peer-dependency warning during UI installation, but the UI connected. Do not
run `npm audit fix --force` to silence npm notices. If global installation
fails due to permissions, use a local npm prefix rather than `sudo`.

### Alternative: separate Z-Wave JS UI Docker container

This option requires a Docker daemon accessible from the machine running the
command. It is not the intended setup for a host without Docker. See the
project handoff for the prior Docker Desktop topology and its caveats.

This is a development mock. It does not simulate radio range, sleep/wakeup,
S2 security, valve mechanics, or prove that a physical TRV uses the supplied
temperature in its internal control loop.
