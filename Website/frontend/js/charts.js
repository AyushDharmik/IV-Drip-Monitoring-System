// ================================================
// js/charts.js - Modular Live Drip Line Chart
// ================================================
// Handles initializing and updating the interactive graphs
// for real-time IV drip and fluid level monitoring.
// ================================================

/**
 * Initializes a dual-axis line chart for patient telemetry.
 * @param {string} canvasId - The canvas DOM ID.
 * @returns {Chart} - The Chart.js instance.
 */
function initPatientChart(canvasId) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  
  // Detect theme colors (matching dark/light mode tokens)
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  // Create subtle gradients
  const gradientFluid = ctx.createLinearGradient(0, 0, 0, 300);
  gradientFluid.addColorStop(0, 'rgba(34, 197, 94, 0.2)');
  gradientFluid.addColorStop(1, 'rgba(34, 197, 94, 0.0)');

  const gradientDrip = ctx.createLinearGradient(0, 0, 0, 300);
  gradientDrip.addColorStop(0, 'rgba(29, 110, 245, 0.2)');
  gradientDrip.addColorStop(1, 'rgba(29, 110, 245, 0.0)');

  const config = {
    type: 'line',
    data: {
      labels: [],
      datasets: [

        {
          label: 'Drip Rate (dpm)',
          data: [],
          borderColor: '#1d6ef5',
          backgroundColor: gradientDrip,
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          yAxisID: 'yDrip',
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { family: 'DM Sans', size: 12, weight: '500' },
            color: textColor
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f1f5f9' : '#0f172a',
          bodyColor: isDark ? '#94a3b8' : '#475569',
          borderColor: gridColor,
          borderWidth: 1,
          titleFont: { family: 'Space Grotesk', weight: '600' },
          bodyFont: { family: 'DM Sans' },
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(1) + ' dpm';
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'DM Sans', size: 10 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8
          }
        },

        yDrip: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 120,
          grid: { drawOnChartArea: false }, // Only draw grid for left axis
          ticks: {
            color: textColor,
            font: { family: 'DM Sans', size: 10 },
            callback: value => value + ' dpm'
          },
          title: {
            display: true,
            text: 'Drip Rate (dpm)',
            color: textColor,
            font: { family: 'Space Grotesk', size: 11, weight: '600' }
          }
        }
      }
    }
  };

  return new Chart(ctx, config);
}

/**
 * Pre-populates the graph with historical readings from the database.
 * @param {Chart} chart - The Chart.js instance.
 * @param {Array} readings - Array of database reading rows.
 */
function loadChartHistory(chart, readings) {
  if (!chart || !readings || !readings.length) return;

  const labels = [];
  const fluidData = [];
  const dripData = [];

  readings.forEach(r => {
    // Format timestamp nicely
    const timeStr = new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    labels.push(timeStr);
    fluidData.push(r.fluid_level);
    dripData.push(r.drip_rate);
  });

  chart.data.labels = labels;
  chart.data.datasets[0].data = dripData;
  chart.update();
}

/**
 * Appends a new real-time reading point to the chart.
 * Keeps a sliding window of the last N data points.
 * @param {Chart} chart - The Chart.js instance.
 * @param {string} label - X-axis time label.
 * @param {number} fluidLevel - Fluid percentage.
 * @param {number} dripRate - Flow rate.
 * @param {number} maxPoints - Maximum sliding window length (default 20).
 */
function appendChartPoint(chart, label, fluidLevel, dripRate, maxPoints = 20) {
  if (!chart) return;

  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(dripRate);

  // If we exceed max elements, shift the arrays
  if (chart.data.labels.length > maxPoints) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  chart.update('none'); // Update without sliding animation for performance
}

/**
 * Adapts grid colors to dark/light theme shifts.
 */
function updateChartTheme(chart) {
  if (!chart) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  chart.options.scales.x.grid.color = gridColor;
  chart.options.scales.x.ticks.color = textColor;

  chart.options.scales.yDrip.ticks.color = textColor;
  chart.options.scales.yDrip.title.color = textColor;
  chart.options.plugins.legend.labels.color = textColor;
  chart.options.plugins.tooltip.backgroundColor = isDark ? '#1e293b' : '#ffffff';
  chart.options.plugins.tooltip.borderColor = gridColor;
  chart.options.plugins.tooltip.titleColor = isDark ? '#f1f5f9' : '#0f172a';
  chart.options.plugins.tooltip.bodyColor = isDark ? '#94a3b8' : '#475569';

  chart.update();
}
