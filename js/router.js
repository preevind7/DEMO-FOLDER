(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  const routes = [
    { pattern: /^\/login\/?$/, page: "login", title: "Choose your role" },
    { pattern: /^\/dashboard\/?$/, page: "dashboard", title: "Dashboard" },
    { pattern: /^\/risk-map\/?$/, page: "risk-map", title: "Corridor Risk Map" },
    { pattern: /^\/segment\/([^/]+)\/?$/, page: "segment", title: "Segment detail", param: "id" },
    { pattern: /^\/simulator\/?$/, page: "simulator", title: "Scenario Simulator" },
    { pattern: /^\/results\/([^/]+)\/?$/, page: "results", title: "Simulation results", param: "simId" },
    { pattern: /^\/assistant\/?$/, page: "assistant", title: "GenAI Assistant" },
    { pattern: /^\/library\/?$/, page: "library", title: "Scenario Library" },
    { pattern: /^\/vehicles\/?$/, page: "vehicles", title: "Vehicles & Trips" },
    { pattern: /^\/trip\/([^/]+)\/?$/, page: "trip", title: "Trip detail", param: "id" },
    { pattern: /^\/departure\/?$/, page: "departure", title: "Departure Planner" },
    { pattern: /^\/hotspots\/?$/, page: "hotspots", title: "Risk Hotspots" },
    { pattern: /^\/model\/?$/, page: "model", title: "Model & Validation" },
    { pattern: /^\/alerts\/?$/, page: "alerts", title: "Alerts" },
    { pattern: /^\/profile\/?$/, page: "profile", title: "Profile" },
    { pattern: /^\/preferences\/?$/, page: "preferences", title: "Preferences" },
    { pattern: /^\/guide\/?$/, page: "guide", title: "Prototype Guide" }
  ];
  let currentPage = null;
  let routeTimer = null;

  function parseLocation() {
    // Hash-only routing keeps deep links working on file:// and GitHub Pages sub-paths.
    const raw = window.location.hash.slice(1) || "/dashboard";
    const queryAt = raw.indexOf("?");
    const pathname = (queryAt === -1 ? raw : raw.slice(0, queryAt)) || "/";
    const query = new URLSearchParams(queryAt === -1 ? "" : raw.slice(queryAt + 1));
    for (const route of routes) {
      const match = pathname.match(route.pattern);
      if (!match) continue;
      const params = {};
      if (route.param) params[route.param] = decodeURIComponent(match[1]);
      query.forEach(function (value, key) { params[key] = value; });
      return { page: route.page, title: route.title, params: params, path: pathname };
    }
    return { page: "not-found", title: "Page not found", params: {}, path: pathname };
  }

  function render() {
    window.clearTimeout(routeTimer);
    const location = parseLocation();
    if (!FDT.state.user && location.page !== "login") {
      FDT.router.navigate("/login");
      return;
    }
    if (currentPage && typeof currentPage.destroy === "function") currentPage.destroy();
    currentPage = null;
    FDT.currentRoute = location;
    if (typeof FDT.renderShell === "function") FDT.renderShell(location);
    const outlet = FDT.$("#page-content");
    const page = FDT.pages && FDT.pages[location.page];
    if (!outlet) return;
    if (!page) {
      outlet.innerHTML = '<div class="error-state" role="alert">This screen could not be loaded. Refresh the prototype and try again.</div>';
      return;
    }
    currentPage = page;
    const renderPage = function () {
      try {
        page.render(outlet, location.params);
      } catch (error) {
        console.error("Page render failed:", error);
        outlet.innerHTML = '<div class="error-state" role="alert">This screen could not be displayed. Please try another page.</div>';
      }
    };
    if (FDT.state.user && location.page !== "login") {
      outlet.innerHTML = '<div class="card" aria-label="Loading page"><div class="skeleton" style="width:34%;margin-bottom:18px"></div><div class="skeleton" style="width:70%;margin-bottom:10px"></div><div class="skeleton" style="width:52%"></div></div>';
      routeTimer = window.setTimeout(renderPage, 300);
    } else {
      renderPage();
    }
    if (typeof FDT.updateActiveNavigation === "function") FDT.updateActiveNavigation(location);
  }

  FDT.router = {
    navigate: function (path) {
      const next = "#" + (path.startsWith("/") ? path : "/" + path);
      if (window.location.hash === next) render();
      else window.location.hash = next;
    },
    render: render,
    parse: parseLocation
  };
  window.addEventListener("hashchange", function () {
    window.clearTimeout(routeTimer);
    render();
  });
}());
