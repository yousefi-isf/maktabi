import Fastify from 'fastify'
import ZKLib, { type ZKUser } from 'node-zklib'

// Load .env natively (requires Node 20.6+)
try { process.loadEnvFile() } catch (e) {}

const DEVICE_IP = process.env.DEVICE_IP || '192.168.2.201'
const DEVICE_PORT = Number(process.env.DEVICE_PORT) || 4370
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || ''
const SCHOOL_ID = process.env.SCHOOL_ID || ''

const POLL_INTERVAL_MS = 1500 // Check for new logs every 1.5s (also serves as keep-alive)
const RECONNECT_DELAY_MS = 5000 // 5s delay before reconnect attempt

const gateway = Fastify({
  logger: false // Keep console clean for real-time attendance logs
})

let zkInstance: ZKLib | null = null
let isDeviceConnected = false
let isConnecting = false
let isPolling = false
let isShuttingDown = false
let pollTimer: NodeJS.Timeout | null = null
let reconnectTimer: NodeJS.Timeout | null = null
let connectionId = 0 // To track stale connection events

// Tracking variables for new attendance records
let lastKnownUserSn: number | null = null
let lastKnownLogCount = 0

// In-memory cache of device users for instant lookup (ID -> User info)
const userCache = new Map<string, ZKUser>()

async function syncDeviceStatus(status: 'connected' | 'disconnected') {
  if (!BACKEND_URL || !GATEWAY_SECRET || !SCHOOL_ID) {
    console.warn(`[Sync] ⚠️ Missing ENV configs, cannot sync status '${status}'.`);
    return;
  }
  try {
    console.log(`[Sync] 📡 Sending device status '${status}' to backend...`);
    const res = await fetch(`${BACKEND_URL}/internal/device/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: GATEWAY_SECRET, schoolId: SCHOOL_ID, status })
    });
    if (!res.ok) {
      console.error(`[Sync] ❌ Backend rejected status update: ${res.status}`);
    } else {
      console.log(`[Sync] ✅ Backend confirmed status: ${status}`);
    }
  } catch (err: any) {
    console.warn(`[Sync] ⚠️ Failed to notify backend of status (${status}): ${err.message}`);
  }
}

function clearTimers() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function scheduleReconnect(reason: string, triggerConnectionId: number) {
  if (isShuttingDown) return
  // Ignore events from old, closed connections
  if (triggerConnectionId !== connectionId) return

  syncDeviceStatus('disconnected'); // Always notify backend of drop immediately
  isDeviceConnected = false
  isPolling = false
  clearTimers()

  console.log(`[ZKLib] ⚠️ Connection dropped (${reason}). Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`)
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null
    await connectToDevice()
  }, RECONNECT_DELAY_MS)
}

async function loadDeviceUsers(): Promise<void> {
  if (!zkInstance) return
  try {
    const res = await zkInstance.getUsers()
    if (res && res.data) {
      userCache.clear()
      for (const u of res.data) {
        userCache.set(String(u.userId), u)
      }
      console.log(`[ZKLib] 👥 Synchronized ${userCache.size} users into local memory.`)
    }
  } catch (err: any) {
    console.warn(`[ZKLib] ⚠️ Failed to fetch users list: ${err?.message || err}`)
  }
}

function resolveUserRole(role?: number): string {
  if (role === undefined || role === null) return 'Unknown'
  switch (role) {
    case 0:
      return 'User'
    case 14:
      return 'SuperAdmin'
    case 2:
      return 'Enroller'
    case 6:
      return 'Manager'
    default:
      return `Role(${role})`
  }
}

function startRealTimePolling() {
  if (pollTimer) clearInterval(pollTimer)

  pollTimer = setInterval(async () => {
    if (!isDeviceConnected || !zkInstance || isPolling || isShuttingDown) return
    isPolling = true

    try {
      // 1. Send ultra-lightweight getInfo (keeps TCP active and checks for changes)
      const info = await zkInstance.getInfo()

      // 2. Check if the device has recorded any new attendances
      if (info.logCounts !== lastKnownLogCount) {
        // Fetch all attendance logs to extract newly added records
        const attendances = await zkInstance.getAttendances()

        if (attendances && attendances.data) {
          const newRecords = attendances.data
            .filter((rec) => rec.userSn > (lastKnownUserSn ?? 0))
            .sort((a, b) => a.userSn - b.userSn)

          if (newRecords.length > 0) {
            for (const record of newRecords) {
              const userIdStr = String(record.deviceUserId)
              let user = userCache.get(userIdStr)

              // If user is not yet in cache (e.g. registered recently), refresh cache
              if (!user) {
                await loadDeviceUsers()
                user = userCache.get(userIdStr)
              }

              const userName = user?.name ? user.name.trim() : 'Unknown'
              const userRole = resolveUserRole(user?.role)

              console.log('----------------------------------------------------')
              console.log('🔔 [New Real-Time Attendance Event]:')
              console.log(`👤 User ID: ${record.deviceUserId}`)
              console.log(`📛 Name: ${userName}`)
              console.log(`🛡️ Role: ${userRole}`)
              console.log(`🔢 Record Serial (#userSn): ${record.userSn}`)
              console.log(`⏰ Time: ${record.recordTime ? new Date(record.recordTime).toISOString() : 'Unknown'}`)
              console.log('Raw Record:', {
                ...record,
                name: userName,
                role: userRole
              })

              // 🔴 Send the punch to the backend
              if (BACKEND_URL && GATEWAY_SECRET && SCHOOL_ID) {
                try {
                  const res = await fetch(`${BACKEND_URL}/internal/device/punch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      secret: GATEWAY_SECRET,
                      schoolId: SCHOOL_ID,
                      deviceUserId: String(record.deviceUserId),
                      recordTime: record.recordTime ? new Date(record.recordTime).toISOString() : new Date().toISOString(),
                      deviceIp: DEVICE_IP,
                      deviceSn: record.userSn,
                    })
                  })
                  
                  if (!res.ok) {
                    console.error(`[Sync] ❌ Failed to sync to backend: ${res.status} ${res.statusText}`)
                  } else {
                    const data = await res.json()
                    const msg = data.alreadyExists ? 'Already processed' : 'Saved to database'
                    console.log(`[Sync] ✅ Success! (${msg})`)
                    if (data.studentName) {
                      console.log(`[Sync] 🧑‍🎓 Matched Student: ${data.studentName} (National Code: ${data.nationalCode})`)
                    } else if (!data.alreadyExists) {
                      console.log(`[Sync] ⚠️ Warning: Unrecognized national code prefix. Record saved as unknown.`)
                    }
                  }
                } catch (err: any) {
                  console.error(`[Sync] ❌ Network error syncing to backend: ${err.message}`)
                }
              } else {
                console.warn('[Sync] ⚠️ BACKEND_URL, GATEWAY_SECRET, or SCHOOL_ID not set. Skipping backend sync.')
              }

              console.log('----------------------------------------------------')

              lastKnownUserSn = record.userSn
            }
          }
        }

        lastKnownLogCount = info.logCounts
      }
    } catch (err: any) {
      console.warn(`[ZKLib] ⚠️ Polling error: ${err?.message || err}`)
      scheduleReconnect('Device polling failed', connectionId)
    } finally {
      isPolling = false
    }
  }, POLL_INTERVAL_MS)
}

async function connectToDevice() {
  if (isShuttingDown || isConnecting) return
  isConnecting = true

  try {
    // Cleanly close previous instance if any
    if (zkInstance) {
      try {
        await zkInstance.disconnect()
      } catch { }
      zkInstance = null
    }

    console.log(`[ZKLib] 🔄 Connecting to attendance device (${DEVICE_IP}:${DEVICE_PORT})...`)

    const currentConnId = ++connectionId;

    const instance = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 5000)

    await instance.createSocket(
      (err) => {
        scheduleReconnect(err?.message || 'Socket error', currentConnId)
      },
      () => {
        scheduleReconnect('Socket closed', currentConnId)
      }
    )

    // Enable TCP keep-alive
    const tcpSocket = (instance as any).zklibTcp?.socket
    if (tcpSocket) {
      tcpSocket.setKeepAlive(true, 10000)
      tcpSocket.setTimeout(0)
    }

    // Get initial baseline
    const info = await instance.getInfo()
    const initialLogs = await instance.getAttendances()

    if (initialLogs && initialLogs.data && initialLogs.data.length > 0) {
      const maxSn = Math.max(...initialLogs.data.map((r) => r.userSn))
      lastKnownUserSn = maxSn
    } else {
      lastKnownUserSn = 0
    }

    lastKnownLogCount = info.logCounts
    zkInstance = instance
    isDeviceConnected = true

    console.log('[ZKLib] ✅ Connected to device successfully.')
    console.log(`[ZKLib] 📊 Device Status: Users: ${info.userCounts}, Total Logs: ${info.logCounts}, Capacity: ${info.logCapacity}`)
    console.log(`[ZKLib] 🎯 Initial baseline established at record #${lastKnownUserSn}.`)

    // Notify backend
    await syncDeviceStatus('connected');

    // Load registered users into memory cache
    await loadDeviceUsers()

    console.log('[ZKLib] 🎧 Real-time attendance monitor is ACTIVE.')
    console.log('[ZKLib] 👉 Place a finger or scan a card on the device to test!\n')

    // Start smart real-time polling
    startRealTimePolling()
  } catch (error: any) {
    isDeviceConnected = false
    console.error(`[ZKLib] ❌ Failed to connect: ${error?.message || error}`)
    scheduleReconnect('Connection failed', connectionId)
  } finally {
    isConnecting = false
  }
}

// REST Endpoints
gateway.get('/health', async () => ({
  status: 'ok',
  device: {
    ip: DEVICE_IP,
    port: DEVICE_PORT,
    connected: isDeviceConnected,
    totalLogs: lastKnownLogCount,
    latestRecordSerial: lastKnownUserSn,
    cachedUsersCount: userCache.size
  }
}))

gateway.get('/device/users', async () => {
  return {
    total: userCache.size,
    users: Array.from(userCache.values()).map((u) => ({
      userId: u.userId,
      name: u.name?.trim() || 'Unknown',
      role: resolveUserRole(u.role),
      cardno: u.cardno
    }))
  }
})

gateway.get('/device/logs/recent', async () => {
  if (!zkInstance || !isDeviceConnected) {
    return { error: 'Device is not connected' }
  }
  try {
    const logs = await zkInstance.getAttendances()
    return {
      total: logs.data.length,
      recent: logs.data.slice(-10)
    }
  } catch (err: any) {
    return { error: err?.message || 'Failed to fetch logs' }
  }
})

// Start HTTP server
async function startServer() {
  try {
    const address = await gateway.listen({ port: 3002, host: '0.0.0.0' })
    console.log(`🚀 Attendance Gateway server listening on port 3002 (${address})`)

    // Initiate connection
    await connectToDevice()
  } catch (err) {
    console.error('Failed to start HTTP server:', err)
    process.exit(1)
  }
}

startServer()

// Graceful shutdown handling
const handleShutdown = async (signal: string) => {
  isShuttingDown = true
  clearTimers()
  console.log(`\n[ZKLib] Received ${signal}. Shutting down and disconnecting device...`)

  try {
    if (zkInstance && isDeviceConnected) {
      await syncDeviceStatus('disconnected')
      await zkInstance.disconnect()
    }
  } catch { }

  await gateway.close()
  process.exit(0)
}

process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('SIGTERM', () => handleShutdown('SIGTERM'))


