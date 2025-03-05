// Simple debug logger
const debug = {
  log: function(message, data) {
    console.log(`[DEBUG] ${message}`, data || '');
    // Also log to the page for visibility
    const debugDiv = document.getElementById('debug-output');
    if (debugDiv) {
      const entry = document.createElement('div');
      entry.innerHTML = `<strong>${new Date().toISOString()}</strong>: ${message} ${data ? JSON.stringify(data) : ''}`;
      debugDiv.appendChild(entry);
    }
  },
  error: function(message, error) {
    console.error(`[ERROR] ${message}`, error || '');
    // Also log to the page for visibility
    const debugDiv = document.getElementById('debug-output');
    if (debugDiv) {
      const entry = document.createElement('div');
      entry.className = 'error';
      entry.innerHTML = `<strong>${new Date().toISOString()} ERROR</strong>: ${message} ${error ? error.toString() : ''}`;
      debugDiv.appendChild(entry);
    }
  }
};

export default debug;