(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};

  function tripStatus(trip) {
    return FDT.state.reroutedTrips.includes(trip.id) ? "Rerouted" : trip.status;
  }
  function statusKind(status) {
    return { "On track": "success", Watch: "warning", "At risk": "danger", Rerouted: "info", Completed: "neutral" }[status] || "neutral";
  }
  function link(label, href, className) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.className = className || "";
    anchor.textContent = label;
    return anchor;
  }
  function render(root) {
    const corridor = FDT.data.getCorridor(FDT.state.corridorId);
    const allTrips = FDT.data.getTrips(corridor.id);
    const activeTrips = allTrips.filter(function (trip) { return !trip.completed; });
    const attention = activeTrips.filter(function (trip) {
      const status = tripStatus(trip);
      return status === "At risk" || status === "Watch";
    });
    const vehicleCounts = FDT.data.vehicles.map(function (vehicle) {
      return { vehicle: vehicle, count: activeTrips.filter(function (trip) { return trip.vehicleId === vehicle.id; }).length };
    });
    let activeCategory = "all";
    let activeStatus = "";

    root.innerHTML =
      '<header class="page-heading"><div><p class="small muted">FLEET OPERATIONS · <span class="simulated">Synthetic trip data</span></p><h1>Vehicles & Trips</h1><p>Monitor active vehicles and trip progress on ' + FDT.escapeHtml(corridor.name) + '.</p></div><div class="page-actions"><a class="button" href="#/risk-map">View corridor map</a><a class="button button--primary" href="#/simulator">New simulation</a></div></header>' +
      '<section class="kpi-grid" aria-label="Fleet summary">' +
      '<article class="kpi-card"><span class="kpi-card__label">Active trips</span><strong class="kpi-card__value number">' + activeTrips.length + '</strong><span class="kpi-card__note">On this corridor</span></article>' +
      '<article class="kpi-card kpi-card--risk"><span class="kpi-card__label">Needs attention</span><strong class="kpi-card__value number">' + attention.length + '</strong><span class="kpi-card__note">At risk or watch · reroutes excluded</span></article>' +
      '<article class="kpi-card"><span class="kpi-card__label">Vehicle types in motion</span><strong class="kpi-card__value number">' + vehicleCounts.filter(function (item) { return item.count > 0; }).length + '</strong><span class="kpi-card__note">Across trucks, buses, cars and vans</span></article>' +
      '<article class="kpi-card"><span class="kpi-card__label">Completed trips</span><strong class="kpi-card__value number">' + allTrips.filter(function (trip) { return trip.completed; }).length + '</strong><span class="kpi-card__note">Synthetic trip history</span></article>' +
      '</section>' +
      '<section class="card fleet-mix-card"><div class="card__header"><div><h2>Active fleet mix</h2><p>Vehicles currently represented in the corridor dataset</p></div></div><div class="fleet-mix">' +
      vehicleCounts.map(function (item) {
        return '<button type="button" class="fleet-mix__item' + (item.count ? "" : " fleet-mix__item--empty") + '" data-category="' + FDT.escapeHtml(item.vehicle.category) + '" aria-label="Filter by ' + FDT.escapeHtml(item.vehicle.type) + ', ' + item.count + ' active"><span class="fleet-mix__icon">' + FDT.icon(item.vehicle.icon) + '</span><span class="fleet-mix__label">' + FDT.escapeHtml(item.vehicle.type) + '</span><strong class="number">' + item.count + '</strong></button>';
      }).join("") + '</div></section>' +
      '<section class="card fleet-trips-card" id="fleet-trips"><div class="card__header"><div><h2>Trips</h2><p>Search and filter trips, then open a record for its timeline.</p></div><label class="field fleet-status-filter"><span>Status</span><select id="fleet-status"><option value="">All statuses</option><option value="On track">On track</option><option value="Watch">Watch</option><option value="At risk">At risk</option><option value="Rerouted">Rerouted</option><option value="Completed">Completed</option></select></label></div>' +
      '<div class="filter-row fleet-category-filters" role="group" aria-label="Filter by vehicle type">' +
      [["all", "All vehicles"], ["truck", "Trucks"], ["bus", "Buses"], ["car", "Cars / Taxis"], ["van", "Vans"]].map(function (item) { return '<button type="button" class="filter-chip" data-fleet-category="' + item[0] + '" aria-pressed="' + String(item[0] === "all") + '">' + item[1] + '</button>'; }).join("") +
      '</div><div id="fleet-table"></div></section>';

    const rows = allTrips.map(function (trip) {
      const vehicle = FDT.data.getVehicle(trip.vehicleId);
      return {
        id: trip.id,
        vehicleType: vehicle.type,
        category: vehicle.category,
        plate: trip.plate,
        route: trip.origin + " → " + trip.destination,
        segment: trip.currentSegment,
        eta: trip.eta,
        status: tripStatus(trip),
        statusFilter: trip.completed ? "Completed" : tripStatus(trip),
        driver: trip.driver,
        trip: trip
      };
    });
    const table = FDT.ui.table({
      searchLabel: "Search trips",
      searchPlaceholder: "Search trip, plate, driver, route...",
      emptyTitle: "No trips match these filters",
      emptyMessage: "Try another vehicle type, status, or search term.",
      columns: [
        { key: "id", label: "Trip / vehicle", render: function (_, row) {
          const wrapper = document.createElement("span");
          wrapper.className = "fleet-trip-cell";
          wrapper.append(link(row.id, "#/trip/" + encodeURIComponent(row.id), "table-primary-link"));
          const detail = document.createElement("small");
          detail.textContent = row.vehicleType + " · " + row.plate;
          wrapper.append(detail);
          return wrapper;
        } },
        { key: "route", label: "Route" },
        { key: "segment", label: "Current segment", render: function (_, row) {
          const segment = FDT.data.segmentById[row.segment];
          const anchor = link(row.segment + (segment ? " · " + segment.name : ""), "#/segment/" + encodeURIComponent(row.segment));
          anchor.className = "table-primary-link";
          return anchor;
        } },
        { key: "eta", label: "ETA" },
        { key: "status", label: "Status", render: function (_, row) { return FDT.ui.badge(row.status, statusKind(row.status)); } },
        { key: "driver", label: "Driver", render: function (_, row) { return row.trip.driver; } },
        { key: "actions", label: "Actions", sortable: false, render: function (_, row) {
          const actions = document.createElement("span");
          actions.className = "fleet-row-actions";
          actions.append(link("Open", "#/trip/" + encodeURIComponent(row.id), "button button--subtle"));
          if (!row.trip.completed) actions.append(link("Simulate", "#/simulator?trip=" + encodeURIComponent(row.id) + "&segment=" + encodeURIComponent(row.segment), "button button--subtle"));
          return actions;
        } }
      ],
      rows: rows,
      pageSize: 8
    });
    FDT.$("#fleet-table", root).append(table.element);

    function updateFilters() {
      const filtered = rows.filter(function (row) {
        return (activeCategory === "all" || row.category === activeCategory) &&
          (!activeStatus || row.statusFilter === activeStatus);
      });
      table.setRows(filtered);
    }
    FDT.$("#fleet-status", root).addEventListener("change", function (event) {
      activeStatus = event.target.value;
      updateFilters();
    });
    root.querySelectorAll("[data-fleet-category]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeCategory = button.getAttribute("data-fleet-category");
        root.querySelectorAll("[data-fleet-category]").forEach(function (item) {
          item.setAttribute("aria-pressed", String(item === button));
        });
        updateFilters();
      });
    });
    root.querySelectorAll(".fleet-mix__item").forEach(function (item) {
      item.addEventListener("click", function () {
        activeCategory = item.getAttribute("data-category");
        root.querySelectorAll("[data-fleet-category]").forEach(function (button) {
          button.setAttribute("aria-pressed", String(button.getAttribute("data-fleet-category") === activeCategory));
        });
        updateFilters();
      });
    });
    const note = FDT.ui.designNote(1, "Fleet counts and status are synthetic and reflect this corridor selection.");
    if (note) root.append(note);
  }

  FDT.pages.vehicles = {
    title: "Vehicles & Trips",
    render: render,
    destroy: function () {}
  };
}());
