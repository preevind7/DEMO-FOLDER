(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};
  const scenarioNames = { current: "Current forecast", "heavy-rain": "Heavy rain", closure: "Road closure", congestion: "Congestion" };

  function toEntry(item, isSaved) {
    const scenario = scenarioNames[item.scenario] || item.type || "Current forecast";
    return {
      id: item.id || item.simId,
      sourceSimId: item.sourceSimId || item.simId || "",
      corridorId: item.corridorId,
      corridor: FDT.data.getCorridor(item.corridorId).name,
      scenario: scenario,
      scenarioKey: Object.keys(scenarioNames).find(function (key) { return scenarioNames[key] === scenario; }) || "current",
      vehicle: FDT.data.getVehicle(item.vehicleId).type,
      vehicleId: item.vehicleId,
      date: item.date || new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt)),
      summary: item.summary || "Simulation results are ready to view.",
      tripId: item.tripId || "",
      saved: isSaved,
      result: item.result || FDT.state.simulations.find(function (result) { return result.simId === (item.sourceSimId || item.simId); }) || null
    };
  }
  function getEntries() {
    return FDT.data.scenarios.filter(function (item) { return !FDT.state.deletedScenarioIds.includes(item.id); }).map(function (item) { return toEntry(item, false); })
      .concat(FDT.state.scenarioSaves.map(function (item) { return toEntry(item, true); }));
  }
  function makeAction(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className || "button button--subtle";
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }
  function render(root) {
    const entries = getEntries();
    root.innerHTML =
      '<header class="page-heading"><div><p class="small muted">REUSE MODULE · <span class="simulated">Saved in this browser</span></p><h1>Scenario Library</h1><p>Review saved what-if tests and reopen, copy, or remove them.</p></div><div class="page-actions"><a class="button button--primary" href="#/simulator">New simulation</a></div></header>' +
      '<section class="kpi-grid library-summary"><article class="kpi-card"><span class="kpi-card__label">Saved scenarios</span><strong class="kpi-card__value number" id="library-count">' + entries.length + '</strong><span class="kpi-card__note">Seeded examples and your saved tests</span></article><article class="kpi-card"><span class="kpi-card__label">Pilot corridors</span><strong class="kpi-card__value number">2</strong><span class="kpi-card__note">Mumbai → Bengaluru · Chennai → Bengaluru</span></article></section>' +
      '<section class="card library-table-card"><div class="card__header"><div><h2>Saved scenarios</h2><p>Search by ID, corridor, vehicle, or result summary.</p></div></div><div id="scenario-table"></div></section>';
    const tableHost = root.querySelector("#scenario-table");

    function renderTable() {
      const currentEntries = getEntries();
      const table = FDT.ui.table({
        rows: currentEntries,
        pageSize: 8,
        searchPlaceholder: "Search saved scenarios",
        searchLabel: "Search saved scenarios",
        filterLabel: "Filter by scenario type",
        filterKey: "scenarioKey",
        allLabel: "All scenario types",
        filters: [
          { value: "current", label: "Current forecast" },
          { value: "heavy-rain", label: "Heavy rain" },
          { value: "closure", label: "Road closure" },
          { value: "congestion", label: "Congestion" }
        ],
        emptyTitle: "No saved scenarios",
        emptyMessage: "Try a different search, or save a simulation from its results.",
        columns: [
          { key: "id", label: "ID", render: function (value, row) {
            const link = document.createElement("a");
            link.className = "table-primary-link";
            link.href = row.result ? "#/results/" + encodeURIComponent(row.result.simId) : "#/simulator?scenario=" + encodeURIComponent(row.scenarioKey) + "&trip=" + encodeURIComponent(row.tripId);
            link.textContent = value;
            return link;
          } },
          { key: "corridor", label: "Corridor" },
          { key: "scenario", label: "Scenario type" },
          { key: "vehicle", label: "Vehicle" },
          { key: "date", label: "Date" },
          { key: "summary", label: "Result summary", sortable: false },
          { key: "id", label: "Actions", sortable: false, render: function (_, row) {
            const group = document.createElement("div");
            group.className = "scenario-actions";
            const open = document.createElement("a");
            open.className = "button button--subtle";
            open.textContent = "Open";
            open.href = row.result ? "#/results/" + encodeURIComponent(row.result.simId) : "#/simulator?scenario=" + encodeURIComponent(row.scenarioKey) + "&trip=" + encodeURIComponent(row.tripId);
            group.append(open);
            group.append(makeAction("Duplicate", "button button--subtle", function () {
              const duplicateId = "COPY-" + String(Date.now()).slice(-6);
              FDT.store.update(function (state) {
                state.scenarioSaves.push({
                  id: duplicateId, sourceSimId: row.sourceSimId, corridorId: row.corridorId,
                  scenario: row.scenarioKey, vehicleId: row.vehicleId,
                  date: "Just now", summary: row.summary, tripId: row.tripId, result: row.result
                });
              });
              FDT.toast("Scenario copied as " + duplicateId + ".");
              root.querySelector("#library-count").textContent = getEntries().length;
              renderTable();
            }));
            group.append(makeAction("Delete", "button button--subtle button--danger", async function () {
              const confirmed = await FDT.ui.confirm("Delete scenario " + row.id + " from this browser?", {
                title: "Delete saved scenario", confirmText: "Delete", danger: true
              });
              if (!confirmed) return;
              FDT.store.update(function (state) {
                if (row.saved) state.scenarioSaves = state.scenarioSaves.filter(function (item) { return item.id !== row.id; });
                else if (!state.deletedScenarioIds.includes(row.id)) state.deletedScenarioIds.push(row.id);
              });
              const remaining = getEntries();
              root.querySelector("#library-count").textContent = remaining.length;
              FDT.toast("Scenario " + row.id + " deleted.");
              renderTable();
            }));
            return group;
          } }
        ]
      });
      tableHost.replaceChildren(table.element);
    }
    renderTable();
    const note = FDT.ui.designNote(1, "Saved scenarios make comparisons repeatable without running the same setup again.");
    if (note) root.append(note);
  }

  FDT.pages.library = { title: "Scenario Library", render: render, destroy: function () {} };
}());
