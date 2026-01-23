/**
 * Pure utility for selecting target device from available devices
 * using a 4-tier priority system.
 * 
 * Priority:
 * 1. Last external device (if still available)
 * 2. Web player (if available)
 * 3. Any active device
 * 4. Web player by name matching
 */
export function selectTargetDevice(
  devices: any[],
  lastExternalDeviceId?: string | null,
  webDeviceId?: string | null
): string | undefined {
  if (!devices || !Array.isArray(devices)) {
    return undefined;
  }

  // Priority 1: Last external device (if still available)
  if (lastExternalDeviceId) {
    const extDevice = devices.find((d: any) => d.id === lastExternalDeviceId);
    if (extDevice) {
      return lastExternalDeviceId;
    }
  }

  // Priority 2: Web player
  if (webDeviceId) {
    const webDevice = devices.find((d: any) => d.id === webDeviceId);
    if (webDevice) {
      return webDeviceId;
    }
  }

  // Priority 3: Any active device
  const activeDevice = devices.find((d: any) => d.is_active);
  if (activeDevice) {
    return activeDevice.id;
  }

  // Priority 4: Web player from devices list (if SDK hasn't set deviceId yet)
  const webPlayerByName = devices.find(
    (d: any) =>
      (d.name || '').includes('Web Player') || (d.name || '').includes('DECODED')
  );
  if (webPlayerByName) {
    return webPlayerByName.id;
  }

  return undefined;
}
