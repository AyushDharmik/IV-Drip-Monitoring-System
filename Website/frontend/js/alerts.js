// ================================================
// js/alerts.js - Shared Alert Rendering Helpers
// ================================================
// Helps display alerts consistently with beautiful icons and badges
// across different patient logs and admin panels.
// ================================================

const ALERT_CONFIG = {
  blood: {
    label: 'Blood Backflow',
    icon: 'fa-solid fa-droplet-slash',
    badgeClass: 'badge-critical',
    style: 'color: #dc2626; font-weight: 600;'
  },
  backflow: {
    label: 'Blood Backflow',
    icon: 'fa-solid fa-droplet-slash',
    badgeClass: 'badge-critical',
    style: 'color: #dc2626; font-weight: 600;'
  },
  critically_empty: {
    label: 'Bottle Empty',
    icon: 'fa-solid fa-circle-exclamation',
    badgeClass: 'badge-critical',
    style: 'color: #dc2626; font-weight: 600;'
  },
  drip_stopped: {
    label: 'Drip Stopped',
    icon: 'fa-solid fa-circle-stop',
    badgeClass: 'badge-critical',
    style: 'color: #dc2626; font-weight: 600;'
  },
  bottle_low: {
    label: 'Bottle Low',
    icon: 'fa-solid fa-triangle-exclamation',
    badgeClass: 'badge-warning',
    style: 'color: #d97706; font-weight: 600;'
  },
  emergency: {
    label: 'Emergency Alert',
    icon: 'fa-solid fa-truck-medical',
    badgeClass: 'badge-critical',
    style: 'color: #ef4444; font-weight: 600;'
  }
};

/**
 * Get display config for a specific alert type
 */
function getAlertConfig(type) {
  return ALERT_CONFIG[type] || {
    label: type || 'System Alert',
    icon: 'fa-solid fa-bell',
    badgeClass: 'badge-normal',
    style: 'color: var(--text2);'
  };
}

/**
 * Returns HTML string of a styled badge for the given alert type
 */
function getAlertBadgeHTML(type) {
  const cfg = getAlertConfig(type);
  return `<span class="badge ${cfg.badgeClass}"><i class="${cfg.icon}" style="margin-right: 4px"></i>${cfg.label}</span>`;
}

/**
 * Formats a database alert entry into a readable message card
 */
function formatAlertMessage(alert) {
  const cfg = getAlertConfig(alert.alert_type);
  return `
    <div style="display: flex; align-items: start; gap: 8px">
      <i class="${cfg.icon}" style="${cfg.style}; margin-top: 2px"></i>
      <div>
        <div style="font-weight: 600; font-size: 0.85rem">${cfg.label}</div>
        <div style="font-size: 0.78rem; color: var(--text2); margin-top: 1px">${alert.message || ''}</div>
      </div>
    </div>
  `;
}

/**
 * Formats a datetime string into a beautiful local time
 */
function formatAlertTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
         ' (' + date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';
}
