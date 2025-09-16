const express = require('express');
const router = express.Router();

// In-memory command queue for each device
const deviceCommands = new Map();
const deviceStatus = new Map();

// Get pending commands for a device
router.get('/commands', (req, res) => {
  const { deviceId } = req.query;
  
  if (!deviceId) {
    return res.status(400).json({ error: 'Device ID required' });
  }
  
  // Check if there are any pending commands for this device
  const commands = deviceCommands.get(deviceId) || [];
  
  if (commands.length > 0) {
    // Return the first command and remove it from the queue
    const command = commands.shift();
    deviceCommands.set(deviceId, commands);
    
    return res.json(command);
  }
  
  // No commands pending
  res.status(204).send(); // No Content
});

// Add a command to a device's queue
router.post('/commands', (req, res) => {
  const { deviceId, command, mode, params } = req.body;
  
  if (!deviceId || !command) {
    return res.status(400).json({ error: 'Device ID and command required' });
  }
  
  const commandObj = {
    command,
    mode,
    params,
    timestamp: Date.now()
  };
  
  // Add command to device queue
  const commands = deviceCommands.get(deviceId) || [];
  commands.push(commandObj);
  deviceCommands.set(deviceId, commands);
  
  console.log(`Command queued for device ${deviceId}:`, commandObj);
  
  res.json({ success: true, message: 'Command queued' });
});

// Receive status update from device
router.post('/status', (req, res) => {
  const statusData = req.body;
  const { deviceId } = statusData;
  
  if (!deviceId) {
    return res.status(400).json({ error: 'Device ID required' });
  }
  
  // Store device status
  deviceStatus.set(deviceId, {
    ...statusData,
    lastSeen: Date.now()
  });
  
  console.log(`Status update from device ${deviceId}:`, statusData);
  
  // Broadcast status to connected clients via Socket.IO
  if (req.io) {
    req.io.to('dashboard').emit('scanner-status', statusData);
  }
  
  res.json({ success: true, message: 'Status updated' });
});

// Get all device statuses
router.get('/status', (req, res) => {
  const statuses = Array.from(deviceStatus.entries()).map(([deviceId, status]) => ({
    deviceId,
    ...status
  }));
  
  res.json(statuses);
});

// Send command to specific device (called by frontend)
router.post('/send-command', (req, res) => {
  const { deviceId, command, mode, params } = req.body;
  
  if (!deviceId || !command) {
    return res.status(400).json({ error: 'Device ID and command required' });
  }
  
  const commandObj = {
    command,
    mode,
    params,
    timestamp: Date.now()
  };
  
  // Add command to device queue
  const commands = deviceCommands.get(deviceId) || [];
  commands.push(commandObj);
  deviceCommands.set(deviceId, commands);
  
  console.log(`Command queued for device ${deviceId}:`, commandObj);
  
  res.json({ success: true, message: 'Command sent to device' });
});

// Clean up old commands and offline devices
setInterval(() => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  
  // Clean up old commands
  for (const [deviceId, commands] of deviceCommands.entries()) {
    const filteredCommands = commands.filter(cmd => (now - cmd.timestamp) < maxAge);
    if (filteredCommands.length !== commands.length) {
      deviceCommands.set(deviceId, filteredCommands);
      console.log(`Cleaned up old commands for device ${deviceId}`);
    }
  }
  
  // Mark devices as offline if they haven't been seen recently
  for (const [deviceId, status] of deviceStatus.entries()) {
    if ((now - status.lastSeen) > maxAge) {
      deviceStatus.set(deviceId, {
        ...status,
        connected: false,
        offline: true
      });
    }
  }
}, 60000); // Run every minute

module.exports = router;