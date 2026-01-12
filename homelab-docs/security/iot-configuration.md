# IoT Configuration

Baseline configuration for IoT devices on the homelab network.

## Principles

- Isolate IoT devices from trusted networks
- Block outbound traffic by default
- Whitelist vendor endpoints only

## Workflow

1. Assign device to the IoT VLAN.
2. Apply outbound allow rules per device.
3. Verify DNS and NTP access.
