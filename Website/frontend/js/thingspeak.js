// ================================================
// js/thingspeak.js - Fetch live sensor data
// ================================================

// ── Fetch latest reading from ThingSpeak ─────────
// channelId  = ThingSpeak channel ID (from patient record)
// readKey    = ThingSpeak Read API Key
async function fetchThingSpeak(channelId, readKey) {
  // If no real channel, return simulated data
  if (!channelId || channelId === '123456') {
    return simulateReading();
  }
  try {
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${readKey}`;
    const res  = await fetch(url);
    const data = await res.json();

    // Map ThingSpeak fields to our format
    // field2=dripRate, field3=flowStatus, field4=bloodDetected
    return {
      dripRate:      parseFloat(data.field2) || 0,
      flowStatus:    data.field3 === '1' ? 'Running' : 'Stopped',
      bloodDetected: data.field4 === '1',
      timestamp:     new Date(data.created_at).getTime(),
      isReal:        true
    };
  } catch (err) {
    console.warn('ThingSpeak fetch failed, using simulation:', err);
    return simulateReading();
  }
}

// ── Simulate data (when hardware not connected) ──────
// Each patient gets slightly different simulated values
// stored in memory so they change gradually
const _simState = {};

function simulateReading(patientId = 'default') {
  if (!_simState[patientId]) {
    _simState[patientId] = {
      dripRate:   Math.random() * 20 + 25,   // 25–45 dpm
    };
  }
  const s = _simState[patientId];

  // Vary drip rate slightly
  s.dripRate = Math.max(0, Math.min(80, s.dripRate + (Math.random() * 4 - 2)));

  const stopped = s.dripRate < 3;

  return {
    dripRate:      stopped ? 0 : parseFloat(s.dripRate.toFixed(1)),
    flowStatus:    stopped ? 'Stopped' : 'Running',
    bloodDetected: Math.random() < 0.005,  // 0.5% chance
    timestamp:     Date.now(),
    isReal:        false
  };
}

// ── Determine alert status from reading ──────────
function getAlertStatus(reading) {
  if (reading.bloodDetected)                              return 'critical';
  if (reading.flowStatus === 'Stopped') return 'critical';
  if (reading.dripRate > 65)                             return 'warning';
  return 'normal';
}

// ── Get alert messages from reading ──────────────
function getAlertMessages(reading) {
  const msgs = [];
  if (reading.bloodDetected)        msgs.push({ type:'backflow',        text:'🩸 Blood Backflow Detected!' });
  if (reading.flowStatus==='Stopped')
                                    msgs.push({ type:'drip_stopped',    text:'🚫 Drip Stopped!' });
  return msgs;
}
