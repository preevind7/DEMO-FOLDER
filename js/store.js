(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  const STORAGE_KEY = "freight-disruption-digital-twin";
  const listeners = new Set();
  const defaults = {
    user: null,
    corridorId: "mumbai-bengaluru",
    preferences: {
      theme: "light",
      wireframe: false,
      designNotes: false,
      reduceMotion: false,
      alertThreshold: 0.6,
      units: "metric"
    },
    watchedSegments: [],
    alertsRead: [],
    reroutedTrips: [],
    closedAlerts: [],
    simulations: [],
    scenarioSaves: [],
    deletedScenarioIds: [],
    tripEvents: {},
    auditLog: []
  };

  // Merge new defaults into saved data so later prototype versions can add fields safely.
  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeDefaults(saved) {
    const state = Object.assign(copy(defaults), saved || {});
    state.preferences = Object.assign(copy(defaults.preferences), saved && saved.preferences || {});
    ["watchedSegments", "alertsRead", "reroutedTrips", "closedAlerts", "simulations", "scenarioSaves", "deletedScenarioIds", "auditLog"].forEach(function (key) {
      if (!Array.isArray(state[key])) state[key] = [];
    });
    if (!state.tripEvents || typeof state.tripEvents !== "object") state.tripEvents = {};
    return state;
  }

  FDT.state = mergeDefaults(null);
  FDT.bus = {
    on: function (callback) {
      listeners.add(callback);
      return function () { listeners.delete(callback); };
    },
    emit: function () {
      listeners.forEach(function (callback) { callback(FDT.state); });
    }
  };
  FDT.store = {
    load: function () {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        FDT.state = mergeDefaults(saved ? JSON.parse(saved) : null);
      } catch (error) {
        FDT.state = mergeDefaults(null);
        FDT.storageError = error;
      }
      return FDT.state;
    },
    save: function () {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(FDT.state));
        FDT.storageError = null;
        return true;
      } catch (error) {
        FDT.storageError = error;
        return false;
      }
    },
    update: function (updater) {
      updater(FDT.state);
      const saved = FDT.store.save();
      FDT.bus.emit();
      if (!saved && typeof FDT.toast === "function") {
        FDT.toast("Your changes are active for this session but could not be saved.");
      }
    },
    reset: function () {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        FDT.state = mergeDefaults(null);
        FDT.bus.emit();
      } catch (error) {
        FDT.storageError = error;
        throw error;
      }
    }
  };
}());
